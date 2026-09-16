import "server-only";
import dns from "node:dns/promises";
import net from "node:net";

/**
 * Récupération et lecture d'une page produit.
 *
 * ============================================================================
 *  LE DANGER, ET COMMENT IL EST FERMÉ
 * ============================================================================
 *  Cette fonction fait quelque chose de risqué : elle demande au SERVEUR
 *  d'aller chercher une adresse fournie par un inconnu. Sans précaution, un
 *  commerçant — ou quelqu'un qui aurait volé son compte — pourrait coller
 *  `http://169.254.169.254/latest/meta-data/` et faire lire au serveur les
 *  identifiants de l'hébergeur. C'est la faille SSRF, et elle a vidé des
 *  entreprises entières.
 *
 *  Quatre verrous, dans cet ordre :
 *
 *   1. SCHÉMA. http et https, rien d'autre. Pas de file://, pas de gopher://,
 *      pas de data:.
 *
 *   2. ADRESSE IP RÉSOLUE. On résout le nom de domaine NOUS-MÊMES et on
 *      vérifie chaque adresse obtenue contre les plages privées, locales,
 *      de lien-local et réservées. Vérifier le NOM ne suffit pas : un domaine
 *      public peut très bien pointer sur 127.0.0.1.
 *
 *   3. CHAQUE REDIRECTION. Les redirections sont suivies À LA MAIN, et
 *      chaque saut repasse par les contrôles 1 et 2. Une page publique qui
 *      redirige vers une adresse interne est le contournement classique.
 *
 *   4. TAILLE ET TEMPS. 2 Mo et 15 secondes au maximum. Une page qui ne
 *      s'arrête jamais immobiliserait le serveur.
 *
 *  Et rien n'est envoyé : ni cookie, ni en-tête d'autorisation. La requête
 *  part aussi nue que celle d'un visiteur anonyme.
 * ============================================================================
 *
 *  CE QUE CETTE FONCTION LIT, ET CE QU'ELLE NE FAIT PAS
 *
 *  Elle lit les MÉTADONNÉES DE PARTAGE que la page publie elle-même :
 *  les données structurées schema.org (JSON-LD), les balises Open Graph, les
 *  microdonnées. Ce sont exactement les informations que les sites exposent
 *  pour que leurs liens s'affichent correctement dans WhatsApp ou Facebook.
 *
 *  Elle ne contourne aucune protection, n'exécute aucun JavaScript, ne se
 *  fait pas passer pour un navigateur d'une personne réelle, et ne parcourt
 *  pas le site. Une page qui refuse la requête est refusée : on le dit au
 *  commerçant plutôt que d'insister.
 */

const TAILLE_MAX = 2 * 1024 * 1024;
const DELAI_MS = 15_000;
const REDIRECTIONS_MAX = 4;

/**
 * Identité annoncée. Honnête et traçable : un administrateur de site qui voit
 * passer ces requêtes sait qui les fait et où se plaindre.
 */
const AGENT = "NovaBoutiqueImport/1.0 (+https://nova.shop/import)";

export type EchecRecuperation = {
  code: "schema" | "adresse_interne" | "dns" | "refus" | "trop_gros" | "delai" | "reseau" | "pas_html";
  message: string;
};

// ---------------------------------------------------------------------------
//  Le filtre d'adresses
// ---------------------------------------------------------------------------

/**
 * Une adresse IP appartient-elle à une plage qu'un serveur ne doit jamais
 * aller visiter sur ordre d'un inconnu ?
 */
export function adresseInterdite(ip: string): boolean {
  const version = net.isIP(ip);
  if (version === 4) {
    const octets = ip.split(".").map(Number);
    if (octets.length !== 4 || octets.some((o) => !Number.isInteger(o) || o < 0 || o > 255)) {
      return true;
    }
    const [a, b] = octets;
    return (
      a === 0                          // 0.0.0.0/8 — « cet hôte »
      || a === 10                      // 10/8 — privé
      || a === 127                     // 127/8 — boucle locale
      || (a === 169 && b === 254)      // 169.254/16 — lien-local, métadonnées d'hébergeur
      || (a === 172 && b >= 16 && b <= 31) // 172.16/12 — privé
      || (a === 192 && b === 168)      // 192.168/16 — privé
      || (a === 100 && b >= 64 && b <= 127) // 100.64/10 — partagé (CGNAT)
      || (a === 192 && b === 0)        // 192.0.0/24 et 192.0.2/24 — réservés
      || (a === 198 && (b === 18 || b === 19)) // 198.18/15 — bancs d'essai
      || (a === 198 && b === 51)       // 198.51.100/24 — documentation
      || (a === 203 && b === 0)        // 203.0.113/24 — documentation
      || a >= 224                      // 224/4 multicast, 240/4 réservé, 255 diffusion
    );
  }

  if (version === 6) {
    const bas = ip.toLowerCase();
    // Une adresse IPv4 encapsulée doit être jugée sur son IPv4.
    const encapsulee = bas.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (encapsulee) return adresseInterdite(encapsulee[1]);

    return (
      bas === "::" || bas === "::1"    // non spécifiée, boucle locale
      || bas.startsWith("fe8") || bas.startsWith("fe9")
      || bas.startsWith("fea") || bas.startsWith("feb")  // fe80::/10 lien-local
      || bas.startsWith("fc") || bas.startsWith("fd")    // fc00::/7 unique local
      || bas.startsWith("ff")                            // ff00::/8 multicast
      || bas.startsWith("2001:db8")                      // documentation
      || bas.startsWith("64:ff9b")                       // NAT64
    );
  }

  // Ni IPv4 ni IPv6 : on refuse par défaut.
  return true;
}

/**
 * Vérifie une adresse avant de la contacter : schéma, puis chaque IP derrière
 * le nom de domaine.
 */
async function autoriser(adresse: string): Promise<{ ok: true; url: URL } | { ok: false; echec: EchecRecuperation }> {
  let url: URL;
  try {
    url = new URL(adresse);
  } catch {
    return { ok: false, echec: { code: "schema", message: "Cette adresse n'est pas valide." } };
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return {
      ok: false,
      echec: { code: "schema", message: "Seules les adresses http et https sont acceptées." },
    };
  }

  // Une IP écrite en clair dans l'adresse : on la juge tout de suite.
  if (net.isIP(url.hostname.replace(/^\[|\]$/g, ""))) {
    if (adresseInterdite(url.hostname.replace(/^\[|\]$/g, ""))) {
      return {
        ok: false,
        echec: { code: "adresse_interne", message: "Cette adresse pointe vers un réseau interne." },
      };
    }
    return { ok: true, url };
  }

  let adresses: { address: string }[];
  try {
    adresses = await dns.lookup(url.hostname, { all: true, verbatim: true });
  } catch {
    return {
      ok: false,
      echec: { code: "dns", message: "Ce nom de domaine est introuvable." },
    };
  }

  if (adresses.length === 0) {
    return { ok: false, echec: { code: "dns", message: "Ce nom de domaine ne répond pas." } };
  }

  // UNE SEULE adresse interdite suffit à refuser : un domaine qui résout à la
  // fois vers une IP publique et vers 127.0.0.1 est exactement l'attaque.
  for (const { address } of adresses) {
    if (adresseInterdite(address)) {
      return {
        ok: false,
        echec: { code: "adresse_interne", message: "Cette adresse pointe vers un réseau interne." },
      };
    }
  }
  return { ok: true, url };
}

// ---------------------------------------------------------------------------
//  La récupération
// ---------------------------------------------------------------------------

export type PageRecuperee = { url: string; html: string; hote: string };

export async function recuperer(
  adresse: string,
): Promise<{ ok: true; page: PageRecuperee } | { ok: false; echec: EchecRecuperation }> {
  let courante = adresse;

  for (let saut = 0; saut <= REDIRECTIONS_MAX; saut++) {
    const verdict = await autoriser(courante);
    if (!verdict.ok) return verdict;

    const minuteur = AbortSignal.timeout(DELAI_MS);
    let reponse: Response;
    try {
      reponse = await fetch(verdict.url, {
        method: "GET",
        // `manual` : on veut voir la redirection pour la revérifier nous-mêmes.
        redirect: "manual",
        signal: minuteur,
        headers: {
          "user-agent": AGENT,
          accept: "text/html,application/xhtml+xml",
          "accept-language": "fr,en;q=0.8",
        },
        cache: "no-store",
      });
    } catch (e) {
      const message = String((e as Error)?.name ?? "");
      if (message === "TimeoutError" || message === "AbortError") {
        return {
          ok: false,
          echec: { code: "delai", message: "La page a mis trop de temps à répondre." },
        };
      }
      return {
        ok: false,
        echec: {
          code: "reseau",
          message: "Impossible de joindre cette page depuis notre serveur.",
        },
      };
    }

    // --- redirection -------------------------------------------------------
    if (reponse.status >= 300 && reponse.status < 400) {
      const suivante = reponse.headers.get("location");
      if (!suivante) {
        return { ok: false, echec: { code: "refus", message: "Cette page redirige nulle part." } };
      }
      // Résolue contre l'adresse courante, puis revérifiée au tour suivant.
      courante = new URL(suivante, verdict.url).toString();
      continue;
    }

    if (!reponse.ok) {
      return {
        ok: false,
        echec: {
          code: "refus",
          message: reponse.status === 403 || reponse.status === 429
            ? "Ce site refuse les récupérations automatiques."
            : `Cette page répond ${reponse.status}.`,
        },
      };
    }

    const type = reponse.headers.get("content-type") ?? "";
    if (!/text\/html|application\/xhtml/i.test(type)) {
      return {
        ok: false,
        echec: { code: "pas_html", message: "Cette adresse ne mène pas à une page produit." },
      };
    }

    // --- lecture bornée ----------------------------------------------------
    // On lit par morceaux et on s'arrête à 2 Mo, au lieu de faire confiance à
    // l'en-tête Content-Length, que rien n'oblige à être exact.
    const lecteur = reponse.body?.getReader();
    if (!lecteur) {
      return { ok: false, echec: { code: "reseau", message: "Réponse vide." } };
    }
    const morceaux: Uint8Array[] = [];
    let total = 0;
    try {
      for (;;) {
        const { done, value } = await lecteur.read();
        if (done) break;
        if (!value) continue;
        total += value.byteLength;
        if (total > TAILLE_MAX) {
          await lecteur.cancel();
          return {
            ok: false,
            echec: { code: "trop_gros", message: "Cette page est trop volumineuse." },
          };
        }
        morceaux.push(value);
      }
    } catch {
      return { ok: false, echec: { code: "reseau", message: "La lecture de la page a été coupée." } };
    }

    const octets = Buffer.concat(morceaux.map((m) => Buffer.from(m)));
    return {
      ok: true,
      page: {
        url: verdict.url.toString(),
        html: octets.toString("utf8"),
        hote: verdict.url.hostname.replace(/^www\./, ""),
      },
    };
  }

  return {
    ok: false,
    echec: { code: "refus", message: "Cette adresse enchaîne trop de redirections." },
  };
}

// ---------------------------------------------------------------------------
//  L'extraction
// ---------------------------------------------------------------------------

export type FicheExtraite = {
  nom: string;
  description: string;
  prix: number | null;
  devise: string | null;
  images: string[];
  marque: string | null;
  caracteristiques: { nom: string; valeur: string }[];
  /** D'où vient chaque information : utile quand le résultat surprend. */
  sources: string[];
};

// Séparateurs de titre. Barre verticale, tirets longs, deux-points et puce
// séparent d'eux-memes ; le tiret simple exige des espaces autour, sinon
// « Robe-wax » sur le site wax.sn se ferait couper en deux.
const SEPARATEUR = "(?:\\s*[|\\u2013\\u2014\\u2022\\u00B7:~]\\s*|\\s+-\\s+)";
const MORCEAU = "[^|\\u2013\\u2014\\u2022\\u00B7:~-]{2,40}";
const SUFFIXE_SITE = new RegExp("^(.*?)" + SEPARATEUR + "(" + MORCEAU + ")$");
const PREFIXE_SITE = new RegExp("^(" + MORCEAU + ")" + SEPARATEUR + "(.*)$");
const MARQUES_ACCENT = new RegExp("[\\u0300-\\u036F]", "g");
const NON_ALPHANUM = new RegExp("[^a-z0-9]", "g");

/** Retire les balises et les entités les plus courantes d'un fragment. */
function enTexte(brut: string): string {
  return brut
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, n) => {
      const code = Number(n);
      return code > 31 && code < 0x110000 ? String.fromCodePoint(code) : " ";
    })
    .replace(/\s+/g, " ")
    .trim();
}

/** Toutes les balises meta d'une page, indexées par `property` ou `name`. */
function lireMetas(html: string): Record<string, string> {
  const metas: Record<string, string> = {};
  // Le decoupage des balises saute par-dessus les valeurs entre guillemets :
  // `content="Robe > 2 ans"` contient un chevron parfaitement legal, qui
  // couperait la balise en deux si on le prenait pour sa fin.
  const balises = html.match(/<meta\b(?:"[^"]*"|'[^']*'|[^>])*>/gi) ?? [];
  for (const balise of balises) {
    // Le guillemet ouvrant est capture, et c'est LUI qui doit refermer. Une
    // classe `[^"']*` s'arretait au premier des deux : « Huile d'arachide »
    // devenait « Huile d », et la moitie des noms francais avec.
    const cle = balise.match(/(?:property|name|itemprop)\s*=\s*("|')([\s\S]*?)\1/i)?.[2];
    const valeur = balise.match(/content\s*=\s*("|')([\s\S]*?)\1/i)?.[2];
    if (cle && valeur && !metas[cle.toLowerCase()]) metas[cle.toLowerCase()] = enTexte(valeur);
  }
  return metas;
}

/** Les blocs JSON-LD, analysés séparément pour qu'un bloc cassé n'emporte pas les autres. */
function lireJsonLd(html: string): unknown[] {
  const blocs: unknown[] = [];
  const motif = /<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let trouve: RegExpExecArray | null;
  while ((trouve = motif.exec(html)) !== null) {
    const corps = trouve[1].trim();
    if (!corps || corps.length > 400_000) continue;
    try { blocs.push(JSON.parse(corps)); } catch { /* bloc illisible : on passe */ }
  }
  return blocs;
}

/** Déplie @graph, les tableaux et les objets imbriqués pour trouver un Product. */
function aplatir(valeur: unknown, profondeur = 0): Record<string, unknown>[] {
  if (profondeur > 6 || !valeur) return [];
  if (Array.isArray(valeur)) return valeur.flatMap((v) => aplatir(v, profondeur + 1));
  if (typeof valeur !== "object") return [];

  const objet = valeur as Record<string, unknown>;
  const suite = [objet];
  for (const cle of ["@graph", "mainEntity", "itemListElement", "hasVariant"]) {
    if (objet[cle]) suite.push(...aplatir(objet[cle], profondeur + 1));
  }
  return suite;
}

function estProduit(objet: Record<string, unknown>): boolean {
  const type = objet["@type"];
  const types = Array.isArray(type) ? type : [type];
  return types.some((t) => typeof t === "string" && /^(Product|ProductModel|IndividualProduct)$/i.test(t));
}

/** Premier nombre lisible dans une valeur de prix (« 19,99 », « US $19.99 »). */
function lirePrix(valeur: unknown): number | null {
  if (typeof valeur === "number") return Number.isFinite(valeur) && valeur > 0 ? valeur : null;
  if (typeof valeur !== "string") return null;

  // Un signe moins devant le nombre : le retirer transformerait « -19.99 » en
  // 19,99, donc un prix negatif en prix valide. On refuse avant de nettoyer.
  if (/^\s*-/.test(valeur)) return null;

  // On garde chiffres, points et virgules, puis on tranche entre separateur
  // de milliers et separateur decimal.
  const nettoye = valeur.replace(/[^\d.,]/g, "");
  if (!nettoye) return null;

  const dernierPoint = nettoye.lastIndexOf(".");
  const derniereVirgule = nettoye.lastIndexOf(",");
  let normalise = nettoye;

  if (dernierPoint >= 0 && derniereVirgule >= 0) {
    // Le SÉPARATEUR DÉCIMAL est le dernier des deux : « 1.299,90 » comme
    // « 1,299.90 » valent tous les deux mille deux cent quatre-vingt-dix-neuf.
    if (derniereVirgule > dernierPoint) {
      normalise = nettoye.replace(/\./g, "").replace(",", ".");
    } else {
      normalise = nettoye.replace(/,/g, "");
    }
  } else if (derniereVirgule >= 0) {
    // Une virgule seule : décimale si deux chiffres derrière, milliers sinon.
    normalise = nettoye.length - derniereVirgule === 3
      ? nettoye.replace(",", ".")
      : nettoye.replace(/,/g, "");
  } else if (dernierPoint >= 0 && nettoye.length - dernierPoint !== 3) {
    normalise = nettoye.replace(/\./g, "");
  }

  const nombre = Number.parseFloat(normalise);
  return Number.isFinite(nombre) && nombre > 0 ? nombre : null;
}

function lireDevise(valeur: unknown): string | null {
  if (typeof valeur !== "string") return null;
  const code = valeur.trim().toUpperCase();
  if (/^[A-Z]{3}$/.test(code)) return code;
  // Symboles les plus courants sur les places de marché.
  if (valeur.includes("€")) return "EUR";
  if (valeur.includes("£")) return "GBP";
  if (valeur.includes("¥")) return "CNY";
  if (valeur.includes("$")) return "USD";
  return null;
}

/**
 * Réduit une étiquette à ses lettres et chiffres sans accents, pour comparer
 * « Amazon.fr » et « amazon fr », ou « Marché Local » et « marche local ».
 */
function normaliser(brut: string): string {
  return brut.normalize("NFD").replace(MARQUES_ACCENT, "").toLowerCase().replace(NON_ALPHANUM, "");
}

/**
 * Enlève du nom le nom du site : « Robe wax en coton | AliExpress » devient
 * « Robe wax en coton ».
 *
 * Deux raisons de le faire. Le nom du fournisseur n'a rien à faire dans la
 * boutique du commerçant — c'est SA boutique. Et « Robe wax | AliExpress »
 * fait un titre de fiche illisible en rayon.
 *
 * On ne coupe QUE si le morceau retiré est bien le nom du site ou son domaine.
 * Sans ce contrôle, « Foulard en wax - 180 cm » perdrait sa taille.
 */
function sansNomDuSite(nom: string, siteDit: string, hote: string): string {
  const etiquettes = new Set<string>();
  const ajouter = (brut: string) => {
    const propre = normaliser(brut);
    // Deux lettres suffisent pour « BJ », pas pour couper au hasard : on exige
    // que l'etiquette vienne du site lui-meme, pas d'une devinette.
    if (propre.length >= 2) etiquettes.add(propre);
  };
  ajouter(siteDit);
  const sansWww = hote.replace(/^www\./i, "");
  ajouter(sansWww);
  const morceaux = sansWww.split(".");
  // « aliexpress » dans fr.aliexpress.com, « amazon » dans amazon.fr.
  if (morceaux.length >= 2) ajouter(morceaux[morceaux.length - 2]);

  let propre = nom.trim();
  // Plusieurs passes : « Robe wax | AliExpress | aliexpress.com » existe.
  for (let passe = 0; passe < 3; passe++) {
    const avant = propre;
    const suffixe = propre.match(SUFFIXE_SITE);
    if (suffixe && etiquettes.has(normaliser(suffixe[2])) && suffixe[1].trim().length >= 3) {
      propre = suffixe[1].trim();
    }
    const prefixe = propre.match(PREFIXE_SITE);
    if (prefixe && etiquettes.has(normaliser(prefixe[1])) && prefixe[2].trim().length >= 3) {
      propre = prefixe[2].trim();
    }
    if (propre === avant) break;
  }
  return propre;
}

function urlAbsolue(brut: unknown, base: string): string | null {
  if (typeof brut === "string") {
    try {
      const url = new URL(brut.trim(), base);
      return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
    } catch { return null; }
  }
  if (brut && typeof brut === "object") {
    const objet = brut as Record<string, unknown>;
    return urlAbsolue(objet.url ?? objet.contentUrl ?? objet["@id"], base);
  }
  return null;
}

/**
 * Lit une page et en tire une fiche produit.
 *
 * Trois sources, par ordre de fiabilité décroissante : les données
 * structurées, Open Graph, puis le titre de la page. Chaque champ prend la
 * première valeur trouvée, et `sources` dit laquelle a servi.
 */
export function extraire(page: PageRecuperee): FicheExtraite {
  const fiche: FicheExtraite = {
    nom: "", description: "", prix: null, devise: null,
    images: [], marque: null, caracteristiques: [], sources: [],
  };

  // --- 1. données structurées schema.org --------------------------------
  const candidats = lireJsonLd(page.html).flatMap((bloc) => aplatir(bloc)).filter(estProduit);
  const produit = candidats[0];

  if (produit) {
    fiche.sources.push("données structurées schema.org");
    fiche.nom = enTexte(String(produit.name ?? "")).slice(0, 120);
    fiche.description = enTexte(String(produit.description ?? "")).slice(0, 2000);

    const marque = produit.brand;
    fiche.marque = typeof marque === "string"
      ? enTexte(marque).slice(0, 60)
      : marque && typeof marque === "object"
        ? enTexte(String((marque as Record<string, unknown>).name ?? "")).slice(0, 60) || null
        : null;

    // Les offres arrivent en objet, en tableau, ou sous AggregateOffer.
    const offres = aplatir(produit.offers).filter((o) => o && typeof o === "object");
    for (const offre of offres) {
      const prix = lirePrix(offre.price ?? offre.lowPrice ?? offre.highPrice);
      if (prix !== null && fiche.prix === null) fiche.prix = prix;
      const devise = lireDevise(offre.priceCurrency);
      if (devise && !fiche.devise) fiche.devise = devise;
    }

    // `image` arrive sous trois formes : une chaine, un tableau de chaines, ou
    // un objet ImageObject. `aplatir` ne voit que les objets — un tableau de
    // chaines lui passait entre les doigts et les images etaient perdues.
    for (const brut of Array.isArray(produit.image) ? produit.image : [produit.image]) {
      const url = urlAbsolue(brut, page.url);
      if (url && !fiche.images.includes(url)) fiche.images.push(url);
    }

    // additionalProperty : c'est là que vivent matière, taille, couleur.
    for (const propriete of aplatir(produit.additionalProperty)) {
      const nom = enTexte(String(propriete.name ?? "")).slice(0, 60);
      const valeur = enTexte(String(propriete.value ?? "")).slice(0, 160);
      if (nom && valeur && fiche.caracteristiques.length < 12) {
        fiche.caracteristiques.push({ nom, valeur });
      }
    }
    for (const [cle, libelle] of [
      ["color", "Couleur"], ["material", "Matière"], ["size", "Taille"],
      ["sku", "Référence"], ["weight", "Poids"], ["countryOfOrigin", "Origine"],
    ] as const) {
      const brut = produit[cle];
      const valeur = typeof brut === "string" ? enTexte(brut).slice(0, 160)
        : brut && typeof brut === "object"
          ? enTexte(String((brut as Record<string, unknown>).name
              ?? (brut as Record<string, unknown>).value ?? "")).slice(0, 160)
          : "";
      if (valeur && fiche.caracteristiques.length < 12
          && !fiche.caracteristiques.some((c) => c.nom === libelle)) {
        fiche.caracteristiques.push({ nom: libelle, valeur });
      }
    }
  }

  // --- 2. Open Graph et compagnie ---------------------------------------
  const metas = lireMetas(page.html);
  const depuisMeta = (cles: string[]): string => {
    for (const cle of cles) if (metas[cle]) return metas[cle];
    return "";
  };

  if (!fiche.nom) {
    fiche.nom = depuisMeta(["og:title", "twitter:title", "title"]).slice(0, 120);
    if (fiche.nom) fiche.sources.push("balises Open Graph");
  }
  if (!fiche.description) {
    fiche.description = depuisMeta(["og:description", "twitter:description", "description"]).slice(0, 2000);
  }
  if (fiche.prix === null) {
    const prix = lirePrix(depuisMeta([
      "og:price:amount", "product:price:amount", "twitter:data1", "price",
    ]));
    if (prix !== null) {
      fiche.prix = prix;
      if (!fiche.sources.includes("balises Open Graph")) fiche.sources.push("balises Open Graph");
    }
  }
  if (!fiche.devise) {
    fiche.devise = lireDevise(depuisMeta([
      "og:price:currency", "product:price:currency", "priceCurrency",
    ]));
  }
  if (!fiche.marque) {
    // `og:site_name` est le nom du SITE, pas celui du fabricant. Le reprendre
    // comme marque faisait dire a la fiche « Marque : AliExpress », soit une
    // caracteristique produit inventee — exactement ce qu'on s'interdit.
    fiche.marque = depuisMeta(["product:brand", "brand"]).slice(0, 60) || null;
  }
  for (const cle of ["og:image", "og:image:secure_url", "twitter:image", "image"]) {
    const url = urlAbsolue(metas[cle], page.url);
    if (url && !fiche.images.includes(url)) fiche.images.push(url);
  }

  // --- 3. dernier recours : le titre de la page -------------------------
  if (!fiche.nom) {
    const titre = page.html.match(/<title[^>]*>([\s\S]{0,300}?)<\/title>/i)?.[1];
    if (titre) {
      // Les places de marché suffixent leur titre : « Produit | Amazon.fr ».
      fiche.nom = enTexte(titre).split(/\s[|–—-]\s/)[0].slice(0, 120);
      fiche.sources.push("titre de la page");
    }
  }

  // Le nom du site n'appartient pas a la fiche du commercant.
  fiche.nom = sansNomDuSite(fiche.nom, metas["og:site_name"] ?? "", page.hote);

  fiche.images = fiche.images.slice(0, 6);
  return fiche;
}

// Les libelles vivent dans origines.ts, qui n'est pas « server-only » :
// l'importateur les affiche cote navigateur.
export { origineDe, ORIGINES_LIBELLES } from "./origines";

// ---------------------------------------------------------------------------
//  Récupération d'une image
// ---------------------------------------------------------------------------

/** Limite propre aux images : au-delà, ce n'est pas une photo de produit. */
const IMAGE_MAX = 8 * 1024 * 1024;

/**
 * Télécharge une image de produit, avec EXACTEMENT les mêmes contrôles
 * d'adresse que pour une page.
 *
 * Les octets rendus ne sont pas encore une image de confiance : c'est
 * `photos.enregistrer()` qui les fait décoder puis ré-encoder par sharp. Un
 * fichier qui prétend être un JPEG sans en être un échoue là.
 */
export async function recupererImage(
  adresse: string, referent?: string,
): Promise<{ ok: true; octets: Buffer } | { ok: false; echec: EchecRecuperation }> {
  const verdict = await autoriser(adresse);
  if (!verdict.ok) return verdict;

  let reponse: Response;
  try {
    reponse = await fetch(verdict.url, {
      // `error` plutôt que `manual` : une image qui redirige vers un réseau
      // interne serait un contournement, et une redirection d'image n'a
      // aucune raison légitime d'exister ici.
      redirect: "error",
      signal: AbortSignal.timeout(DELAI_MS),
      headers: {
        "user-agent": AGENT,
        accept: "image/*",
        // Certaines places de marché refusent une image sans référent. On
        // donne la page d'origine, ce qui est la vérité.
        ...(referent ? { referer: referent } : {}),
      },
      cache: "no-store",
    });
  } catch {
    return {
      ok: false,
      echec: { code: "reseau", message: "Cette image n'a pas pu être téléchargée." },
    };
  }

  if (!reponse.ok) {
    return {
      ok: false,
      echec: {
        code: "refus",
        message: reponse.status === 403
          ? "Ce site refuse le téléchargement direct de ses images."
          : `L'image répond ${reponse.status}.`,
      },
    };
  }

  const type = reponse.headers.get("content-type") ?? "";
  if (!/^image\//i.test(type)) {
    return { ok: false, echec: { code: "pas_html", message: "Cette adresse n'est pas une image." } };
  }

  const lecteur = reponse.body?.getReader();
  if (!lecteur) return { ok: false, echec: { code: "reseau", message: "Image vide." } };

  const morceaux: Buffer[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await lecteur.read();
      if (done) break;
      if (!value) continue;
      total += value.byteLength;
      if (total > IMAGE_MAX) {
        await lecteur.cancel();
        return { ok: false, echec: { code: "trop_gros", message: "Cette image dépasse 8 Mo." } };
      }
      morceaux.push(Buffer.from(value));
    }
  } catch {
    return { ok: false, echec: { code: "reseau", message: "Téléchargement interrompu." } };
  }

  return { ok: true, octets: Buffer.concat(morceaux) };
}
