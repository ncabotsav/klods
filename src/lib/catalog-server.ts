import "server-only";
import { readFileSync } from "node:fs";
import path from "node:path";
import { SetsIndex, playableModels, type SetEntry } from "./catalog";

/**
 * Lecture de public/data/sets.json pendant le build (pages statiques des sets).
 * Sans données (pipeline jamais lancé en local), le catalogue est vide : `npm run data:fixtures` en fournit un.
 */
let cache: SetEntry[] | null = null;

export function allSets(): SetEntry[] {
  if (cache) return cache;
  try {
    const raw = readFileSync(path.join(process.cwd(), "public", "data", "sets.json"), "utf8");
    cache = SetsIndex.parse(JSON.parse(raw)).sets.filter((s) => playableModels(s).length > 0);
  } catch {
    cache = [];
  }
  return cache;
}

export function findSet(number: string): SetEntry | undefined {
  return allSets().find((s) => s.number === number);
}

/** Paramètres des pages de sets ; un exemple fictif si le catalogue est vide, pour que le build passe. */
export function setParams(): { numero: string }[] {
  const sets = allSets();
  return sets.length ? sets.map((s) => ({ numero: s.number })) : [{ numero: "exemple" }];
}

/** Quatre sets proches à proposer après un montage : même thème, années voisines. */
export function relatedSets(set: SetEntry, count = 4): SetEntry[] {
  return allSets()
    .filter((s) => s.number !== set.number && s.theme === set.theme && s.models.some((m) => m.status === "ok"))
    .sort((a, b) => Math.abs((a.year ?? 0) - (set.year ?? 0)) - Math.abs((b.year ?? 0) - (set.year ?? 0)))
    .slice(0, count);
}
