---
name: verify
description: Comment construire, lancer et piloter Sen Gestion dans un vrai navigateur pour vérifier un changement — sans casser la session de développement en cours. À utiliser avant de conclure qu'un changement fonctionne.
---

# Vérifier Sen Gestion en conditions réelles

Ceci documente le démarrage à froid pour que la prochaine session n'ait pas
à le refaire. Testé de bout en bout avant d'être écrit.

## Isoler avant de lancer quoi que ce soit

Cette session peut déjà faire tourner un serveur de développement sur un
port connu (3000, ou un port choisi au hasard par une session précédente).
Ne jamais réutiliser un port fixe : choisir un port au hasard, et un dossier
de données à soi.

```bash
V=/tmp/.../verify-$(date +%s)      # un dossier de travail par vérification
mkdir -p "$V/data"
PORT=$(( (RANDOM % 5000) + 20000 ))
```

## Construire, peupler, lancer

```bash
npm run build                                       # échoue fort si un env var mal formé (voir src/lib/seo.ts)
DOSSIER_DONNEES="$V/data" node scripts/seed.mjs      # base de test avec des annonces reelles
(DOSSIER_DONNEES="$V/data" npx next start -p "$PORT" > "$V/server.log" 2>&1 &)
sleep 7
curl -sS --noproxy '*' -o /dev/null -w "%{http_code}\n" "http://127.0.0.1:$PORT/"
```

Identifiants créés par `seed.mjs` : agence `demo@sengestion.sn` /
`demo1234`, locataire `775551001` / `Loyer2026`. Pour tester l'espace
d'administration, démarrer avec `ADMIN_EMAILS="demo@sengestion.sn"` en plus.

## Piloter dans un vrai navigateur

Playwright n'est pas une dépendance du projet — l'installer pour la durée
du test, le retirer ensuite, ne jamais le laisser dans `package.json` :

```bash
npm install --no-save playwright-core
# Chromium est deja present sur cet environnement :
#   executablePath: "/opt/pw-browsers/chromium"
npm uninstall --no-save playwright-core   # a la fin, toujours
```

Toujours bloquer les requêtes externes (`ctx.route` qui n'accepte que
`127.0.0.1`) : sinon Google Fonts traîne le chargement et fausse les
captures. Toujours `waitUntil: "domcontentloaded"`, jamais `networkidle` —
Next continue le prefetch des liens visibles en arrière-plan, ce qui ne
finit jamais sur cette page d'accueil (voir plus bas).

## Faux positifs déjà rencontrés — ne pas les re-signaler

- **`net::ERR_ABORTED` sur des adresses `?_rsc=...` en localhost**, pour à
  peu près tous les liens visibles sur la page d'accueil (`/tarifs`,
  `/connexion`, `/biens/6`…). Confirmé présent à l'identique sur un commit
  antérieur non lié (`git worktree add --detach <dossier> HEAD~1`, même
  test) : c'est le prefetch React Server Components de Next, annulé quand
  la page reste ouverte sans qu'on clique le lien. Aucun rapport avec le
  code qu'on est en train de vérifier. Ne le compter que si le NOMBRE
  change entre l'avant et l'après.
- **`Failed to load resource` sur `fonts.googleapis.com`** : c'est le
  propre blocage réseau du script de test, pas l'application.
- **Une page qui renvoie « introuvable » entre deux agences** peut être la
  protection qui fonctionne, pas un bug — vérifier lequel avant de le
  signaler.

## Mesurer un contraste sur les pixels réels, pas en théorie

Le bandeau d'accueil pose du texte sur un décor. Ne jamais calculer un
contraste sur les couleurs déclarées dans le code : masquer le texte,
capturer le fond qui reste, chercher le pixel le plus clair (ou le plus
sombre) dans la zone exacte du texte.

```js
await page.addStyleTag({ content: "h1, h1 + p { color: transparent !important; }" });
await page.screenshot({ path: "fond.png", clip: zoneDuTexte });
```

Puis décoder le PNG et calculer le ratio WCAG pixel par pixel (voir
l'historique git pour un script Python autonome, sans dépendance). Refaire
la mesure séparément sur mobile (≤ 640px) : un cadre étiré différemment
peut épaissir un décor et faire chuter le contraste alors que la version
ordinateur est confortable.

## Nettoyer

```bash
pkill -f "next start -p $PORT"
npm uninstall --no-save playwright-core
rm -rf "$V"
git worktree remove <dossier> --force   # si un worktree de comparaison a été créé
```
