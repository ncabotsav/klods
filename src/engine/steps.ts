/**
 * Moteur d'étapes : transforme le modèle chargé en une liste d'étapes de notice.
 *
 * - Une étape ajoute des pièces (ou un sous-ensemble déjà construit) dans un « contexte » : le modèle
 *   principal, ou un sous-ensemble en cours de construction.
 * - Un sous-ensemble se construit à part, juste avant l'étape où on le pose, comme dans une notice papier.
 *   S'il sert plusieurs fois, on le construit une fois (« à construire 2 fois ») et chaque copie se pose.
 * - Les étapes vides disparaissent ; une suite de STEP sans pièce entre eux ne compte qu'une fois.
 * - Chaque objet reçoit userData.klodsStep : l'index de l'étape qui l'ajoute.
 */
import type { Object3D } from "three";
import { loaderName, type ModelText, type ViewRotation } from "./ldraw-text.ts";

export type Step = {
  index: number;
  /** Chemin des sous-ensembles ouverts, du modèle principal (vide) au sous-ensemble en cours. */
  path: Object3D[];
  /** Groupe dans lequel on construit (le modèle principal ou un sous-ensemble). */
  context: Object3D;
  /** Pièces ajoutées à cette étape. */
  parts: Object3D[];
  /** Sous-ensembles déjà construits posés à cette étape. */
  assemblies: Object3D[];
  /** Lettre du sous-ensemble en construction (A, B…), null dans le modèle principal. */
  assembly: string | null;
  /** Nombre d'exemplaires de ce sous-ensemble dans le modèle (« à construire 2 fois »). */
  repeat: number;
  rotation: ViewRotation;
};

export type StepPlan = {
  steps: Step[];
  /** Lettre de chaque sous-ensemble, par nom de fichier. */
  assemblyLetters: Map<string, string>;
  /** Nombre total de pièces posées, en comptant chaque copie des sous-ensembles. */
  totalParts: number;
};

export const isPart = (o: Object3D) => /\.dat$/i.test(String(o.userData?.fileName ?? "")) && !!(o as { isGroup?: boolean }).isGroup;
const isAssembly = (o: Object3D) => !!(o as { isGroup?: boolean }).isGroup && !isPart(o) && o.userData?.type !== "Part";
const fileOf = (o: Object3D) => loaderName(String(o.userData?.fileName ?? o.name ?? ""));

/** Compte les pièces d'un objet (lui-même si c'est une pièce, sinon ses pièces de premier niveau, récursivement). */
export function countParts(o: Object3D): number {
  if (isPart(o)) return 1;
  return o.children.reduce((n, c) => n + countParts(c), 0);
}

const letter = (i: number): string => (i < 26 ? String.fromCharCode(65 + i) : `${letter(Math.floor(i / 26) - 1)}${String.fromCharCode(65 + (i % 26))}`);

export function buildSteps(model: Object3D, info: ModelText): StepPlan {
  const steps: Step[] = [];
  const letters = new Map<string, string>();
  const uses = new Map<string, number>();
  const built = new Set<string>();

  // combien de fois chaque sous-ensemble sert, pour dire « à construire 2 fois »
  model.traverse((o) => {
    if (o !== model && isAssembly(o)) uses.set(fileOf(o), (uses.get(fileOf(o)) ?? 0) + 1);
  });

  const walk = (group: Object3D, path: Object3D[], assembly: string | null, repeat: number) => {
    const refs = info.references.get(path.length ? fileOf(group) : "") ?? [];
    let refIndex = 0;
    const rotationOf = (child: Object3D): ViewRotation => {
      const want = fileOf(child);
      for (let i = refIndex; i < refs.length; i++) {
        if (refs[i].file === want) {
          refIndex = i + 1;
          return refs[i].rotation;
        }
      }
      return null;
    };

    let current: Step | null = null;
    const open = (rotation: ViewRotation): Step => ({
      index: -1,
      path,
      context: group,
      parts: [],
      assemblies: [],
      assembly,
      repeat,
      rotation,
    });
    const close = () => {
      if (current && (current.parts.length || current.assemblies.length)) {
        current.index = steps.length;
        for (const o of [...current.parts, ...current.assemblies]) o.userData.klodsStep = current.index;
        steps.push(current);
      }
      current = null;
    };

    for (const child of group.children) {
      if (!(child as { isGroup?: boolean }).isGroup) continue;
      const rotation = rotationOf(child);
      if (child.userData.startingBuildingStep) close();
      current ??= open(rotation);

      if (isPart(child)) {
        current.parts.push(child);
        continue;
      }

      // un sous-ensemble : on le construit à part s'il ne l'a pas encore été, puis on le pose
      const name = fileOf(child);
      if (!built.has(name)) {
        built.add(name);
        letters.set(name, letter(letters.size));
        // ses étapes passent avant l'étape en cours, qui reste ouverte (chaque appel a la sienne)
        walk(child, [...path, child], letters.get(name)!, uses.get(name) ?? 1);
      }
      current.assemblies.push(child);
    }
    close();
  };

  // repère pour les miniatures : l'orientation d'une pièce se calcule jusqu'à ce groupe
  model.userData.klodsRoot = true;
  walk(model, [], null, 1);

  // un objet jamais posé (sous-ensemble vide, pièce hors étape) apparaît avec la première étape
  model.traverse((o) => {
    if (o !== model && o.userData.klodsStep === undefined) o.userData.klodsStep = -1;
  });

  return { steps, assemblyLetters: letters, totalParts: countParts(model) };
}
