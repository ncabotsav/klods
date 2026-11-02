/**
 * node scripts/data/diagnose.ts public/data/models/40379-1/principal.mpd.gz
 *
 * Charge un modèle phase par phase et affiche ce que contient le fichier et ce que fait le chargeur,
 * pour comprendre un modèle qui échoue ou qui dépasse le délai du contrôle.
 */
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { LoadingManager } from "three";
import { LDrawLoader } from "three/addons/loaders/LDrawLoader.js";
import { LDrawConditionalLineMaterial } from "three/addons/materials/LDrawConditionalLineMaterial.js";
import { readModelText } from "../../src/engine/ldraw-text.ts";
import { buildSteps } from "../../src/engine/steps.ts";

const file = process.argv[2];
const t0 = Date.now();
const log = (msg: string) => console.log(`[${((Date.now() - t0) / 1000).toFixed(1)} s] ${msg}`);

const raw = gunzipSync(readFileSync(file)).toString("utf8");
const lines = raw.split(/\r?\n/);
const files = lines.filter((l) => /^\s*0\s+FILE\s/i.test(l));
log(`${file} : ${(raw.length / 1e6).toFixed(2)} Mo, ${lines.length} lignes, ${files.length} fichiers intégrés`);
log(`lignes de type 1 : ${lines.filter((l) => /^\s*1\s/.test(l)).length}, STEP : ${lines.filter((l) => /^\s*0\s+STEP\b/i.test(l)).length}, ROTSTEP : ${lines.filter((l) => /^\s*0\s+ROTSTEP\b/i.test(l)).length}`);
log(`fichiers de modèle (hors parts/ et p/) : ${files.filter((f) => !/FILE\s+(parts|p)\//i.test(f)).length}`);
console.log(files.filter((f) => !/FILE\s+(parts|p)\//i.test(f)).slice(0, 30).join("\n"));

const info = readModelText(raw);
log(`texte lu : ${info.references.size} fichiers référencés, ${info.colours.size} couleurs`);

// noms référencés mais absents du fichier : le chargeur ira les chercher ailleurs
const embedded = new Set(files.map((f) => f.replace(/^\s*0\s+FILE\s+/i, "").trim().replace(/\\/g, "/").toLowerCase()));
const missing = new Set<string>();
for (const refs of info.references.values()) for (const r of refs) if (!embedded.has(r.file)) missing.add(r.file);
log(`références absentes du fichier : ${missing.size}`);
console.log([...missing].slice(0, 30).join("\n"));

let requests = 0;
const manager = new LoadingManager();
manager.setURLModifier((url) => {
  requests++;
  if (requests <= 20 || requests % 1000 === 0) log(`requête n° ${requests} : ${url}`);
  return `data:text/plain,${encodeURIComponent(`0 introuvable ${url}`)}`;
});
const loader = new LDrawLoader(manager);
loader.setConditionalLineMaterial(LDrawConditionalLineMaterial);
// comme le site pour un fichier de moins de 2 Mo (SMOOTH=0 pour le désactiver, comme le contrôle)
loader.smoothNormals = process.env.SMOOTH !== "0";
loader.addDefaultMaterials();
const timer = setInterval(() => log(`chargement en cours, ${requests} requêtes`), 10_000);
loader.parse(
  info.text,
  (model) => {
    clearInterval(timer);
    log(`chargé, ${requests} requêtes`);
    // enfants vides : le rendu de three.js lit .visible sur chaque enfant et plante dessus
    const holes: string[] = [];
    const walk = (o: import("three").Object3D, path: string) => {
      o.children.forEach((c, i) => {
        if (!c) holes.push(`${path}/${i}`);
        else walk(c, `${path}/${c.name || c.type}`);
      });
    };
    walk(model, model.name || "modèle");
    log(`enfants vides : ${holes.length}`);
    console.log(holes.slice(0, 20).join("\n"));
    const plan = buildSteps(model, info);
    log(`étapes : ${plan.steps.length}, pièces : ${plan.totalParts}, sous-ensembles : ${plan.assemblyLetters.size}`);
    process.exit(0);
  },
  (err) => {
    clearInterval(timer);
    log(`erreur : ${err}`);
    process.exit(1);
  },
);
