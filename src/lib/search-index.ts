import type { SearchEntry } from "./search";
import { asset } from "./site";

/**
 * Index de recherche (/recherche.json), chargé une fois par page et partagé entre la recherche
 * et le catalogue : la page construite ne porte pas les 1 500 sets, le navigateur les demande après.
 */
let promise: Promise<SearchEntry[]> | null = null;
export function loadSearchIndex(): Promise<SearchEntry[]> {
  promise ??= fetch(asset("/recherche.json")).then((r) => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json() as Promise<SearchEntry[]>;
  });
  promise.catch(() => (promise = null));
  return promise;
}
