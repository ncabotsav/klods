# Règles du projet Klods

Klods joue les notices de montage LEGO® en 3D, étape par étape, à partir des modèles LDraw de l'OMR. Le plan complet (sprints, stack, hébergement) est dans le document « Klods, plan de construction en sprints ».

## Next.js 16

Cette version a des API et des conventions qui peuvent différer de ce que tu connais. Avant d'écrire du code Next.js, lis le guide concerné dans `node_modules/next/dist/docs/` et tiens compte des avertissements de dépréciation. `agentRules: false` dans `next.config.ts` empêche `next dev` de réécrire ce fichier.

## Site statique

- Klods est exporté en site statique (`output: "export"`) tant qu'il est sur GitHub Pages : pas de routes API, pas de rendu à la demande, pas d'optimisation d'images, pas de middleware.
- Sur Pages, le site vit sous `/klods` (`NEXT_PUBLIC_BASE_PATH`). `next/link` ajoute ce préfixe tout seul ; pour `fetch()` et les `<img>` vers `/public`, passe par `asset()` de `src/lib/site.ts`.
- Les routes API (IA, retours) arrivent au sprint 7, avec l'hébergement sur Cloudflare.

## Règles de la maison

- **Aucun contenu LEGO copié** : ni notices PDF, ni photos de boîtes, ni logo, ni textes de LEGO. On affiche des modèles LDraw et des dessins générés par notre moteur.
- **Marque LEGO** : jamais dans un nom, une URL ou un nom de fichier public. Dans un texte, toujours en adjectif (« les sets LEGO® »), avec le ®, dans la même police que le texte autour. L'avertissement du pied de page reste sur toutes les pages.
- **Attribution** : chaque fiche de set cite l'auteur du fichier LDraw (licence CC BY). Les données Rebrickable sont créditées dans le pied de page et la page À propos.
- **Données brutes hors de Git** : les fichiers téléchargés (OMR, bibliothèque LDraw, CSV Rebrickable) vont dans `data/raw/`, ignoré par Git. Seuls les fichiers construits par les scripts sont publiés.
- **Textes** : tous dans `src/i18n/fr.ts`, jamais en dur dans les composants. Le français est la langue de référence ; l'anglais suivra la même structure.
- **Ton** : on tutoie, phrases courtes et concrètes, voix active. Un bouton dit ce qui se passe (« Commencer », « Étape suivante »). Pas de tiret cadratin dans les textes de l'interface : virgule, deux-points ou parenthèses.
- **Couleurs** : uniquement par les jetons de `src/app/globals.css`. Le thème sombre redéfinit les jetons, jamais les composants.
- **Style** : CSS Modules et variables CSS, pas de kit UI. Mise en page en flex ou grid avec `gap`.
- **Accessibilité** : focus visible, `prefers-reduced-motion` respecté, chaque contrôle a un nom accessible.

## Avant de pousser

```bash
npm run lint && npm run typecheck && npm run build
```

Une pull request par lot de travail ; `main` se déploie automatiquement sur GitHub Pages.
