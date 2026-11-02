/**
 * Charge un fichier packé avec le moteur du site (src/engine) et compte ce qu'il contient.
 * Sert au contrôle de tous les sets : un fichier qui ne se charge pas ici ne se chargera pas sur le site,
 * et le nombre d'étapes est celui que le site affichera.
 */
import type { Object3D } from "three";
import { loadModelText } from "../../../src/engine/load.ts";
import { buildSteps, isPart } from "../../../src/engine/steps.ts";

export type ModelStats = {
  /** Étapes de la notice, telles que le moteur d'étapes les produit (sous-ensembles et ROTSTEP compris). */
  steps: number;
  /** Pièces placées dans le modèle (une pièce posée deux fois compte deux fois). */
  parts: number;
  /** Pièces différentes (même numéro et même couleur). */
  uniqueParts: number;
  /** Nombre de commandes « 0 STEP » ou « 0 ROTSTEP » écrites dans le fichier. */
  stepCommands: number;
  /** Sous-ensembles construits à part. */
  assemblies: number;
};

function colourOf(o: Object3D): string {
  for (let cur: Object3D | null = o; cur; cur = cur.parent) {
    const c = cur.userData?.colorCode;
    if (c != null && c !== "16" && c !== "24") return String(c);
  }
  return "?";
}

export async function analyzeModel(packedText: string): Promise<ModelStats> {
  // la géométrie lisse ne sert pas au contrôle, et coûte cher sur les gros sets
  const { model, info } = await loadModelText(packedText, { smoothNormals: false });
  const plan = buildSteps(model, info);

  const unique = new Set<string>();
  model.traverse((o) => {
    if (isPart(o) && !(o.parent && isPart(o.parent))) unique.add(`${String(o.userData.fileName).toLowerCase()}#${colourOf(o)}`);
  });

  return {
    steps: plan.steps.length,
    parts: plan.totalParts,
    uniqueParts: unique.size,
    stepCommands: info.stepCommands,
    assemblies: plan.assemblyLetters.size,
  };
}
