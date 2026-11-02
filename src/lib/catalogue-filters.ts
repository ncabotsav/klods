import type { createSearch, SearchEntry } from "./search.ts";

/** Filtres du catalogue ; la logique est ici (testée), le composant ne fait que l'afficher. */
export type PartsBucket = "small" | "medium" | "large" | "huge";
export type SortKey = "number" | "name" | "recent" | "oldest" | "parts";
export type CatalogueFilters = { q: string; theme: string; decade: number; parts: PartsBucket | ""; withSteps: boolean; sort: SortKey };

export const PAGE_SIZE = 48;

const BUCKET_RANGE: Record<PartsBucket, [number, number]> = { small: [0, 99], medium: [100, 299], large: [300, 999], huge: [1000, Infinity] };

const byNumber = (a: SearchEntry, b: SearchEntry) => a.n.localeCompare(b.n, "en", { numeric: true });
const SORTERS: Record<SortKey, (a: SearchEntry, b: SearchEntry) => number> = {
  number: byNumber,
  name: (a, b) => a.t.localeCompare(b.t, "fr") || byNumber(a, b),
  recent: (a, b) => (b.y ?? 0) - (a.y ?? 0) || byNumber(a, b),
  oldest: (a, b) => (a.y ?? 9999) - (b.y ?? 9999) || byNumber(a, b),
  parts: (a, b) => b.p - a.p || byNumber(a, b),
};

/** Décennies présentes dans le catalogue (1950, 1960…). */
export const decadesOf = (entries: SearchEntry[]) => [...new Set(entries.flatMap((e) => (e.y ? [Math.floor(e.y / 10) * 10] : [])))].sort((a, b) => a - b);

/**
 * Sets qui passent les filtres. Avec un texte de recherche, l'ordre suit la pertinence
 * tant que le tri est celui par défaut (numéro) ; sinon le tri choisi l'emporte.
 */
export function filterEntries(entries: SearchEntry[], f: CatalogueFilters, engine?: ReturnType<typeof createSearch>): SearchEntry[] {
  const q = f.q.trim();
  const base = q && engine ? engine.search(q, entries.length).map((h) => h.entry) : entries;
  const range = f.parts ? BUCKET_RANGE[f.parts] : null;
  const list = base.filter(
    (e) =>
      (!f.theme || e.h === f.theme) &&
      (!f.decade || (e.y !== null && e.y >= f.decade && e.y < f.decade + 10)) &&
      (!range || (e.p >= range[0] && e.p <= range[1])) &&
      (!f.withSteps || e.e),
  );
  return q && f.sort === "number" ? list : [...list].sort(SORTERS[f.sort]);
}
