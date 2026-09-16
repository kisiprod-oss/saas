import { NextRequest, NextResponse } from "next/server";

/**
 * Les sous-domaines de boutique.
 *
 * `chez-awa.nova.shop` doit servir `/b/chez-awa` sans que le visiteur voie
 * jamais ce chemin. Une REECRITURE (et non une redirection) le fait : l'URL
 * dans la barre d'adresse reste celle du commercant.
 *
 * Trois cas, dans cet ordre :
 *
 *  1. Domaine racine (nova.shop, www.nova.shop, localhost) : rien a faire,
 *     c'est le site commercial.
 *  2. Sous-domaine `<slug>.nova.shop` : on reecrit vers /b/<slug>.
 *  3. Domaine totalement etranger : c'est un domaine personnalise. On pose
 *     l'hote dans un en-tete et on reecrit vers /b/_domaine, qui cherche la
 *     boutique correspondante.
 *
 * Le middleware NE TOUCHE PAS a la base : il tourne sur le moteur « edge »,
 * ou better-sqlite3 n'existe pas. Il se contente de reecrire ; c'est la page
 * qui verifie que la boutique existe et est publiee.
 */

/** Le domaine racine du service, sans le port. */
const RACINE = (process.env.NOVA_DOMAINE_RACINE ?? "nova.shop").toLowerCase();

/** Hotes qui ne sont jamais une boutique. */
const RESERVES = new Set(["www", "api", "admin", "app", "static", "cdn", "assets"]);

/** Chemins qui appartiennent au service, jamais a une boutique. */
const CHEMINS_SERVICE = [
  "/api", "/_next", "/administration", "/tableau-de-bord", "/creer",
  "/connexion", "/inscription", "/mot-de-passe-oublie", "/reinitialiser",
  "/favicon.ico", "/robots.txt", "/sitemap.xml",
];

export function middleware(requete: NextRequest) {
  const hote = (requete.headers.get("host") ?? "").toLowerCase().split(":")[0];
  const chemin = requete.nextUrl.pathname;

  // Les chemins du service passent tels quels, quel que soit l'hote : sinon
  // une boutique sur domaine personnalise ne pourrait plus recevoir ses
  // notifications de paiement.
  if (CHEMINS_SERVICE.some((c) => chemin === c || chemin.startsWith(`${c}/`))) {
    return NextResponse.next();
  }

  // Developpement et domaine racine : site commercial.
  if (!hote || hote === "localhost" || hote === "127.0.0.1"
      || hote === RACINE || hote === `www.${RACINE}`) {
    return NextResponse.next();
  }

  // Sous-domaine du service.
  if (hote.endsWith(`.${RACINE}`)) {
    const slug = hote.slice(0, -(RACINE.length + 1));
    if (!slug || RESERVES.has(slug) || slug.includes(".")) return NextResponse.next();

    const url = requete.nextUrl.clone();
    url.pathname = `/b/${slug}${chemin === "/" ? "" : chemin}`;
    return NextResponse.rewrite(url);
  }

  // Domaine personnalise : la page /b/_domaine lit l'en-tete pour retrouver
  // la boutique. On le pose nous-memes plutot que de faire confiance a
  // l'en-tete `host` recu plus loin dans la chaine.
  const url = requete.nextUrl.clone();
  url.pathname = `/b/_domaine${chemin === "/" ? "" : chemin}`;
  const entetes = new Headers(requete.headers);
  entetes.set("x-nova-domaine", hote);
  return NextResponse.rewrite(url, { request: { headers: entetes } });
}

export const config = {
  // On evite d'appeler le middleware sur les fichiers statiques : c'est du
  // temps de calcul pour rien sur chaque image.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
