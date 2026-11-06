import { ABSENTS_PATH, absentEntries, type AbsentsFile } from "./absents";
import type { SearchEntry } from "./search";
import { asset } from "./site";

/* Chargement côté navigateur, à part : absents.ts tourne aussi dans Node (scripts de données). */
let promise: Promise<SearchEntry[]> | null = null;
/** Chargé une fois, seulement quand on tape une recherche ; un échec (fichier pas encore construit) ne casse rien. */
export function loadAbsents(): Promise<SearchEntry[]> {
  promise ??= fetch(asset(ABSENTS_PATH))
    .then((r) => (r.ok ? (r.json() as Promise<AbsentsFile>) : { themes: [], sets: [] }))
    .then(absentEntries)
    .catch(() => []);
  return promise;
}
