import type { Object3D } from "three";
import type { LoadedModel } from "./useModel";
import type { Dict, Locale } from "@/i18n";

export type Callout = { key: string; url: string; count: number; label: string };

/** Lettre d'un sous-ensemble posé. */
export const letterOf = (loaded: LoadedModel, assembly: Object3D) =>
  loaded.plan.assemblyLetters.get(String(assembly.userData.fileName).toLowerCase());

/** Pièces et sous-ensembles d'une étape, avec leur miniature : l'encadré de la notice. */
export function stepCallouts(loaded: LoadedModel, index: number, locale: Locale, t: Dict): Callout[] {
  const step = loaded.plan.steps[index];
  if (!step) return [];
  const { instructions, thumbs } = loaded.engine;
  const list: Callout[] = instructions.groupParts(step.parts, loaded.info, locale).map((g) => ({
    key: g.key,
    url: thumbs.partThumbnail(`${loaded.key}|${g.key}`, g.sample),
    count: g.count,
    label: instructions.describeGroup(g, locale),
  }));
  for (const a of step.assemblies) {
    const letter = letterOf(loaded, a) ?? "?";
    const key = `assembly:${letter}`;
    const existing = list.find((c) => c.key === key);
    if (existing) existing.count++;
    else list.push({ key, url: thumbs.partThumbnail(`${loaded.key}|${key}`, a), count: 1, label: `${t.player.assembly} ${letter}` });
  }
  return list;
}

export const stepText = (loaded: LoadedModel, index: number, locale: Locale) => {
  const step = loaded.plan.steps[index];
  return step ? loaded.engine.instructions.stepInstruction(step, loaded.info, (a) => letterOf(loaded, a), locale) : "";
};
