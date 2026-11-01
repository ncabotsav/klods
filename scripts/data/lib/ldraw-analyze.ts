/**
 * Charge un fichier packé avec LDrawLoader (le même chargeur que le site) et compte ce qu'il contient.
 * Sert au contrôle de tous les sets : un fichier qui ne se charge pas ici ne se chargera pas sur le site.
 */
import { LDrawLoader } from "three/addons/loaders/LDrawLoader.js";
import { LDrawConditionalLineMaterial } from "three/addons/materials/LDrawConditionalLineMaterial.js";
import { LoadingManager, type Group, type Object3D } from "three";

export type ModelStats = {
  /** Étapes qui ajoutent au moins une pièce. */
  steps: number;
  /** Pièces placées dans le modèle (une pièce posée deux fois compte deux fois). */
  parts: number;
  /** Pièces différentes (même numéro et même couleur). */
  uniqueParts: number;
  /** Nombre de commandes « 0 STEP » ou « 0 ROTSTEP » écrites dans le fichier. */
  stepCommands: number;
};

const isPart = (o: Object3D) => (o as Group).isGroup && /\.dat$/i.test(String(o.userData.fileName ?? ""));

function colourOf(o: Object3D): string {
  for (let cur: Object3D | null = o; cur; cur = cur.parent) {
    const c = cur.userData?.colorCode;
    if (c != null && c !== "16" && c !== "24") return String(c);
  }
  return "?";
}

/*
 * Un fichier packé contient tout. Si une référence manque, LDrawLoader essaie de la télécharger, ce qui
 * bloque sans fin hors d'un navigateur : on refuse tout accès réseau, il note la pièce absente et continue.
 */
globalThis.fetch = (() => Promise.reject(new Error("pas de réseau pendant le contrôle"))) as typeof fetch;

export async function analyzeModel(packedText: string): Promise<ModelStats> {
  // Une adresse relative fait planter Request hors navigateur et bloque la file du chargeur : on donne
  // une adresse absolue, que le fetch ci-dessus refuse proprement
  const manager = new LoadingManager();
  manager.setURLModifier((url) => `http://klods.invalid/${url}`);
  const loader = new LDrawLoader(manager);
  loader.setConditionalLineMaterial(LDrawConditionalLineMaterial);
  loader.smoothNormals = false; // la géométrie lisse ne sert pas au contrôle, et coûte cher sur les gros sets
  // Les couleurs viennent du fichier packé (LDConfig intégré) ; les matériaux par défaut couvrent le reste
  loader.addDefaultMaterials();
  const model: Group = await new Promise((ok, ko) => loader.parse(packedText, ok, ko));

  const buckets = new Map<number, number>();
  const unique = new Set<string>();
  let parts = 0;
  model.traverse((o) => {
    if (!isPart(o) || (o.parent && isPart(o.parent))) return;
    parts++;
    unique.add(`${String(o.userData.fileName).toLowerCase()}#${colourOf(o)}`);
    const step = Number(o.userData.buildingStep ?? 0);
    buckets.set(step, (buckets.get(step) ?? 0) + 1);
  });

  return {
    steps: buckets.size,
    parts,
    uniqueParts: unique.size,
    stepCommands: (packedText.match(/^\s*0\s+(?:ROT)?STEP\b/gm) ?? []).length,
  };
}
