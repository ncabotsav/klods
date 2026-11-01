# Klods

Notices de montage LEGO® en 3D, étape par étape. Tape le numéro de ton set : chaque étape s'affiche en 3D, avec les pièces à prendre, et peut être lue à voix haute.

Projet en cours de construction. Préversion : [ncabotsav.github.io/klods](https://ncabotsav.github.io/klods/)

## Stack

- Next.js 16 (App Router, export statique), React 19, TypeScript
- CSS Modules et variables CSS, sans kit UI
- three.js et `LDrawLoader` pour la 3D (à partir du sprint 2)
- Hébergement : GitHub Pages pour la préversion, Cloudflare au lancement public

## Lancer le projet

```bash
npm install
npm run dev        # http://localhost:3000
```

Construire le site statique comme sur GitHub Pages :

```bash
NEXT_PUBLIC_BASE_PATH=/klods npm run build   # le site est dans out/
```

Avant de pousser : `npm run lint && npm run typecheck && npm run build`.

## D'où viennent les données

- **Modèles 3D et étapes** : [Official Model Repository](https://library.ldraw.org/omr) de LDraw.org, fichiers sous licence CC BY, auteurs crédités sur chaque set.
- **Géométrie des pièces** : [bibliothèque de pièces LDraw](https://library.ldraw.org/), CC BY.
- **Noms, thèmes, années des sets** : [Rebrickable](https://rebrickable.com/).

Klods n'utilise ni les notices, ni les photos, ni le logo de LEGO.

## Licence

Code sous licence MIT (voir [LICENSE](LICENSE)). Les marques et les données tierces sont décrites dans [NOTICE](NOTICE).

Inspiré de [Bygga](https://www.usebygga.com/) ([code source](https://github.com/Nutlope/bygga)), qui fait la même chose pour les meubles IKEA.

LEGO® est une marque du Groupe LEGO, qui ne parraine, n'autorise ni ne soutient ce projet.
