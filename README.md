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

Avant de pousser : `npm test && npm run lint && npm run typecheck && npm run build`.

## Pipeline de données

Les modèles 3D ne sont pas dans Git : le workflow GitHub Actions **Données** les construit (onglet Actions, « Run workflow »), chaque lundi et sur les pull requests qui touchent au pipeline (échantillon de 25 sets). Ses résultats partent dans le cache, où le déploiement les reprend.

| Commande | Ce qu'elle fait |
| --- | --- |
| `npm run data:omr` | Lit les fiches des sets OMR (liste dans `data/omr-ids.txt`) et télécharge leurs fichiers LDraw |
| `npm run data:ldraw` | Télécharge et décompresse la bibliothèque de pièces LDraw complète |
| `npm run data:rebrickable` | Télécharge les CSV Rebrickable (sets, thèmes) |
| `npm run data:pack` | Intègre les pièces dans chaque modèle et compresse le résultat dans `public/data/models/` |
| `npm run check` | Charge chaque modèle avec LDrawLoader, compte étapes et pièces, écrit `data/build/check-summary.md` |
| `npm run data:index` | Construit `public/data/sets.json`, validé par le schéma de `src/lib/catalog.ts` |
| `npm run data` | Tout, dans l'ordre |

Variables utiles : `DATA_SAMPLE=25` (échantillon), `DATA_REFRESH=1` (retélécharger), `CHECK_MIN_PASS=95` (seuil du contrôle).

Les téléchargements sont polis : une requête par seconde au plus, un User-Agent qui renvoie vers ce dépôt, et un cache dans `data/raw/` (ignoré par Git) pour ne jamais redemander un fichier.

## D'où viennent les données

- **Modèles 3D et étapes** : [Official Model Repository](https://library.ldraw.org/omr) de LDraw.org, fichiers sous licence CC BY, auteurs crédités sur chaque set.
- **Géométrie des pièces** : [bibliothèque de pièces LDraw](https://library.ldraw.org/), CC BY.
- **Noms, thèmes, années des sets** : [Rebrickable](https://rebrickable.com/).

Klods n'utilise ni les notices, ni les photos, ni le logo de LEGO.

## Licence

Code sous licence MIT (voir [LICENSE](LICENSE)). Les marques et les données tierces sont décrites dans [NOTICE](NOTICE).

Inspiré de [Bygga](https://www.usebygga.com/) ([code source](https://github.com/Nutlope/bygga)), qui fait la même chose pour les meubles IKEA.

LEGO® est une marque du Groupe LEGO, qui ne parraine, n'autorise ni ne soutient ce projet.
