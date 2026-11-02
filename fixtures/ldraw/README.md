# Modèles de test

Six modèles packés, repris tels quels des exemples de three.js (`examples/models/ldraw/officialLibrary/models`, licence MIT pour three.js). Ce sont des modèles de l'Official Model Repository de LDraw.org, sous licence Creative Commons Attribution 2.0 (voir l'en-tête de chaque fichier) :

| Fichier | Set | Auteur du modèle |
| --- | --- | --- |
| `4915-1.mpd.gz` | Mini Construction | Ken Drew |
| `4918-1.mpd.gz` | Mini Flyers | Ken Drew |
| `4838-1.mpd.gz` | Mini Vehicles | Ken Drew |
| `889-1.mpd.gz` | Radar Truck | Willy Tschager |
| `30051-1.mpd.gz` | X-wing Fighter, mini | Jude Parrill |
| `30054-1.mpd.gz` | AT-ST, mini | Jude Parrill |

Ils servent aux tests du moteur d'étapes (`src/engine/*.test.ts`) : sous-ensembles construits plusieurs fois (4915), sous-ensembles imbriqués (889), commandes ROTSTEP (30051, 30054, 889).
