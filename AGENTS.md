# Règles du projet Klods

Klods joue les notices de montage LEGO® en 3D, étape par étape, à partir des modèles LDraw de l'OMR. Le plan complet (sprints, stack, hébergement) est dans le document « Klods, plan de construction en sprints ».

## Next.js 16

Cette version a des API et des conventions qui peuvent différer de ce que tu connais. Avant d'écrire du code Next.js, lis le guide concerné dans `node_modules/next/dist/docs/` et tiens compte des avertissements de dépréciation. `agentRules: false` dans `next.config.ts` empêche `next dev` de réécrire ce fichier.

## Site statique et hébergement

- Klods est exporté en site statique (`output: "export"`) : pas de routes API Next, pas de rendu à la demande, pas d'optimisation d'images, pas de middleware.
- Hébergé sur Cloudflare Workers (`wrangler.jsonc`) : les fichiers de `out/` sont servis tels quels, le Worker `worker/index.ts` ne reçoit que `/api/*` (aujourd'hui `/api/retours`). Job `cloudflare` du workflow « Déploiement », actif si les secrets `CLOUDFLARE_API_TOKEN` et `CLOUDFLARE_ACCOUNT_ID` existent ; build à la racine (`NEXT_PUBLIC_BASE_PATH` vide). Le code reste sur GitHub.
- GitHub Pages ne sert plus qu'une redirection (`scripts/site/github-pages/`) : chaque adresse sous ncabotsav.github.io/klods part vers la même page de klods.app, et l'ancien service worker s'efface. Les tests de bout en bout gardent le préfixe `/klods` (`NEXT_PUBLIC_BASE_PATH`) pour vérifier qu'aucun lien ne l'oublie : `next/link` l'ajoute seul ; pour `fetch()`, les `<img>` et les liens simples, passe par `asset()` ou `buildPageHref()` de `src/lib/site.ts`.
- `npm run build` lance ensuite `scripts/site/finalize.ts` : retire les fichiers de navigation interne des pages `/monter/` et `/imprimer/` (on y va par des liens simples, `buildPageHref()`, jamais `next/link`), pose une CSP stricte dans chaque page (empreintes des scripts en ligne) et échoue au-delà de 19 000 fichiers (limite Cloudflare gratuite : 20 000) ou d'un fichier de plus de 25 Mio.
- En-têtes de sécurité et cache : `public/_headers`. Les tests de bout en bout échouent si la CSP bloque quelque chose.
- Retours : formulaire `/retours/` (`src/components/FeedbackForm.tsx`), validation partagée dans `src/lib/feedback.ts`, gardés un an dans Workers KV, e-mail vers le secret `FEEDBACK_TO`. Jamais l'adresse IP.
- Supervision : workflow « Supervision » toutes les 30 minutes (pages clés, un modèle, la 404, le Worker) ; un échec part par e-mail via les notifications GitHub Actions.
- Mesure d'audience : Cloudflare Web Analytics, sans cookie, injecté automatiquement par Cloudflare sur klods.app (rien dans le code). `src/components/Analytics.tsx` ne sert que si on coupe l'injection : il pose alors le script avec la variable `CF_ANALYTICS_TOKEN` du dépôt. La CSP autorise ses domaines.

## Règles de la maison

- **Aucun contenu LEGO copié** : ni notices PDF, ni photos de boîtes, ni logo, ni textes de LEGO. On affiche des modèles LDraw et des dessins générés par notre moteur.
- **Marque LEGO** : jamais dans un nom, une URL ou un nom de fichier public. Dans un texte, toujours en adjectif (« les sets LEGO® »), avec le ®, dans la même police que le texte autour. L'avertissement du pied de page reste sur toutes les pages.
- **Attribution** : chaque fiche de set cite l'auteur du fichier LDraw (licence CC BY). Les données Rebrickable sont créditées dans le pied de page et la page À propos.
- **Données brutes hors de Git** : les fichiers téléchargés (OMR, bibliothèque LDraw, CSV Rebrickable) vont dans `data/raw/`, ignoré par Git. Seuls les fichiers construits par les scripts sont publiés.
- **Textes** : tous dans `src/i18n/fr.ts` (référence) et `src/i18n/en.ts` (même structure, vérifiée par TypeScript), jamais en dur dans les composants. Côté serveur, `dictFor(locale)` ; côté client, `useT()` ou `useLocale()` de `src/i18n/LocaleProvider.tsx`. Les traductions anglaises sont écrites à la main.
- **Ton** : on tutoie, phrases courtes et concrètes, voix active. Un bouton dit ce qui se passe (« Commencer », « Étape suivante »). Pas de tiret cadratin dans les textes de l'interface : virgule, deux-points ou parenthèses.
- **Couleurs** : uniquement par les jetons de `src/app/globals.css`. Le thème sombre redéfinit les jetons, jamais les composants. Choix du thème dans l'en-tête (`ThemeSwitch`, `src/lib/theme.ts`) : automatique, clair ou sombre, posé sur `<html data-theme>` par un script du `<head>` avant le premier affichage.
- **Style** : CSS Modules et variables CSS, pas de kit UI. Mise en page en flex ou grid avec `gap`.
- **Accessibilité** : focus visible, `prefers-reduced-motion` respecté, chaque contrôle a un nom accessible.

## Pipeline de données

- Les scripts sont dans `scripts/data/`, en TypeScript exécuté directement par Node (pas de compilation) : imports avec l'extension `.ts`, seulement de la syntaxe effaçable (pas d'`enum`, pas de `namespace`).
- Tout téléchargement passe par `fetchCached()` de `scripts/data/lib/http.ts` : cache disque, une requête par seconde par site, User-Agent du projet.
- Le format de `public/data/sets.json` est défini une seule fois, dans `src/lib/catalog-schema.ts` (zod), et validé à l'écriture ; les petites fonctions sur le catalogue sont dans `src/lib/catalog.ts`, sans zod, pour ne pas alourdir les pages.
- Tests : `npm test` (`node --test`), à côté du code (`*.test.ts`). Parcours complet : `npm run e2e` (Playwright, dossier `e2e/`), joué en CI sur chaque PR.

## Deux langues

- Pages qu'on trouve par un moteur de recherche, dans les deux langues : français à la racine (`src/app/(pages)/`), anglais sous `/en` (`src/app/en/`). Les deux routes appellent la même vue de `src/views/` avec la langue. Chaque page déclare sa jumelle (`bilingual()` de `src/lib/seo.ts`, hreflang) ; le sitemap liste les deux.
- Pages communes (`src/app/(outils)/` : montage, impression, atelier, retours, hors connexion, essai) et 404 : la langue choisie dans le navigateur (`src/lib/locale-pref.ts`), à défaut celle du navigateur. Une page d'une langue enregistre ce choix.
- Lien FR / EN dans l'en-tête (`LanguageSwitch`) : même page dans l'autre langue (lue dans les liens hreflang), ou changement sur place sur une page commune.
- Thèmes : nom et adresse dans chaque langue (`themeName()` de `src/i18n/themes-fr.ts`), un groupe français = un groupe anglais. Index de recherche par langue : `/recherche.json`, `/en/recherche.json`.
- Les fiches de sets n'ont qu'un `index.html` dans chaque langue : on y va par `setPageHref()`, jamais `next/link`.
- Les tests de bout en bout tournent avec un navigateur en français ; `e2e/langues.spec.ts` vérifie l'anglais.

## Moteur 3D

- `src/engine/` est partagé par le site et par le contrôle du catalogue : `load.ts` (LDrawLoader), `ldraw-text.ts` (ROTSTEP, couleurs, descriptions), `steps.ts` (moteur d'étapes), `connectors.ts` (points d'attache lus dans les primitives LDraw), `insertion.ts` (direction d'arrivée de chaque pièce), `instructions.ts` (consignes en français et en anglais). Ces fichiers tournent aussi dans Node : pas d'accès au DOM.
- Direction d'arrivée : alignement de points d'attache, puis tenon entré dans le volume d'une pièce, puis volume touché, puis le haut de la pièce. `npm run check` mesure la part des pièces guidées et le temps de calcul ; sur `/essai`, la case « Montrer la direction d'arrivée » dessine les flèches.
- Au-delà de 1 Mo, `useModel` calcule les directions d'arrivée dans un Web Worker (`insertion.worker.ts`) pendant que la page charge le modèle, puis les pose (`applyInsertions`) ; repli sur la page si le Worker échoue.
- `stage.ts` et `thumbs.ts` sont réservés au navigateur, chargés à la demande depuis un composant client.
- Tout changement du moteur d'étapes change le nombre d'étapes des sets : relancer le workflow « Données » après le merge.
- `/essai` est la page de travail du moteur (non indexée, hors menu) : charge n'importe quel set et affiche les temps.

## Parcours de montage

- `/set/<numéro>/monter/` : couverture, pièces, montage, fin, dans un seul composant client (`src/components/build/BuildApp.tsx`). L'adresse porte l'état : `?modele=`, `?etape=12`, `?vue=pieces`, `?vue=fin` ; avancer d'une étape ajoute une entrée d'historique (le geste retour recule).
- `/set/<numéro>/imprimer/` : toutes les étapes en blocs A4.
- Pages construites au build pour chaque set de `public/data/sets.json` (`src/lib/catalog-server.ts`) ; sans données, une page « exemple » vide fait passer le build.
- Progression dans le navigateur uniquement (`src/lib/progress.ts`, localStorage) : rien ne part sur un serveur.
- `/atelier/` (`src/components/workshop/WorkshopApp.tsx`) : chiffres, montages en cours, vitrine des sets terminés, sauvegarde et reprise dans un fichier (`exportProgress`, `importProgress`). Non indexé.
- Partage d'un set terminé (fin du montage, vitrine de l'atelier) : `ShareButton` dessine une carte 1200 × 630 dans le navigateur (`src/lib/share-card.ts`, couverture du set, nom, temps), puis menu de partage du système ou téléchargement de l'image.
- Accueil : aperçu 3D d'un vrai set qui se monte en boucle (`src/components/home/HeroPreview.tsx`, sets choisis par `heroSets()`), chargé après la page et seulement s'il est visible ; dessins au trait de « Comment ça marche » (`HowIllustration.tsx`), couleurs par les jetons.

## Hors-ligne et performances

- `public/sw.js` (service worker maison, enregistré par `src/components/ServiceWorker.tsx` sur le site construit) : fichiers du site en cache d'abord, modèles gardés (ouvrir un set garde aussi sa fiche et sa page de montage), pages réseau d'abord, sinon redirection vers `/hors-connexion/`, qui liste les sets gardés. Changer la stratégie : incrémenter `VERSION`.
- `src/app/manifest.ts` et `public/icons/` : installation sur l'écran d'accueil.
- Polices par `next/font/local` (`src/app/fonts.ts`, fichiers des paquets @fontsource) : préchargées ; les jetons `--font-*` de `globals.css` reprennent leurs variables.
- Le moteur baisse seul la résolution du rendu si les images ralentissent (`stage.ts`).
- Les tests de bout en bout comptent un audit axe (`e2e/accessibilite.spec.ts`, thème sombre compris) et le mode avion (`e2e/hors-ligne.spec.ts`). En CI, sur une PR : Chrome toujours ; Safari (WebKit), Firefox, Edge et Lighthouse en plus quand la PR touche au moteur 3D, au parcours de montage, au service worker, aux tests ou aux dépendances. Après un merge sur `main`, on construit et on publie sans rejouer les tests de bout en bout (déjà joués sur la PR).

## Catalogue et référencement

- Fiche statique par set : `/set/<numéro>/` (indexée) ; `/monter/` et `/imprimer/` sont en `noindex` avec la fiche en canonique. Un set absent tombe sur la 404, qui reconnaît l'adresse et renvoie vers la notice officielle.
- `/catalogue/` (filtres dans l'adresse : `?theme=`, `?annees=`, `?pieces=`, `?etapes=1`, `?tri=`) et `/catalogue/<thème>/`. La logique des filtres est dans `src/lib/catalogue-filters.ts`, la recherche floue dans `src/lib/search.ts` (testées).
- `/recherche.json`, `/sitemap.xml` et `/robots.txt` sont des routes statiques (`dynamic = "force-static"`), servies à la racine de klods.app.
- Couvertures et cartes de partage : `npm run data:covers` (après un build), dans le workflow « Données ». Fichiers dans `public/data/covers/`, cache dans `data/raw/covers/`. Changer le dessin : incrémenter `COVER_VERSION`. Sans couverture, la carte affiche une brique dessinée.

## Avant de lancer un nouveau sprint

On ne commence jamais un sprint sans avoir repassé le précédent. La repasse se fait sur `main` à jour et suit ces étapes :

1. Relire la liste de tâches du sprint précédent dans le plan : chaque tâche est faite, ou reportée explicitement avec la raison et le sprint où elle part.
2. Vérifier chaque critère « Fini quand » du sprint, avec une preuve (commande lancée, page ouverte, mesure).
3. Lancer `npm run lint && npm run typecheck && npm run build` sur `main`, et `npm run check` dès qu'il existe.
4. Vérifier que le dernier déploiement (Cloudflare, et la redirection GitHub Pages) a réussi et que le site en ligne s'affiche correctement (accueil, pages ajoutées par le sprint, 404).
5. Relire les changements du sprint pour les règles de ce fichier : aucun contenu LEGO copié, textes dans `src/i18n/fr.ts`, couleurs par les jetons, accessibilité.
6. Corriger ce qui ne va pas dans une pull request à part, avant le nouveau sprint.
7. Résumer la repasse à l'utilisateur (ce qui est OK, ce qui a été corrigé, ce qui est reporté) et attendre son accord avant de lancer le sprint suivant.

## Avant de pousser

```bash
npm test && npm run lint && npm run typecheck && npm run build
```

Une pull request par lot de travail ; `main` se déploie automatiquement sur klods.app (Cloudflare).
