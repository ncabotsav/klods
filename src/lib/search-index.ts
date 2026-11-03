import type { SearchEntry } from "./search";
import { asset } from "./site";
import { localeHref, type Locale } from "@/i18n";

/**
 * Index de recherche (/recherche.json), chargé une fois par page et partagé entre la recherche
 * et le catalogue : la page construite ne porte pas les 1 500 sets, le navigateur les demande après.
 */
const promises: Partial<Record<Locale, Promise<SearchEntry[]>>> = {};
/** Index d'une langue (/recherche.json, /en/recherche.json) : les thèmes y sont dans cette langue. */
export function loadSearchIndex(locale: Locale = "fr"): Promise<SearchEntry[]> {
  const promise = (promises[locale] ??= fetch(asset(localeHref(locale, "/recherche.json"))).then((r) => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json() as Promise<SearchEntry[]>;
  }));
  promise.catch(() => delete promises[locale]);
  return promise;
}
