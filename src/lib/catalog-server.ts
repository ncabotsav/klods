import "server-only";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { defaultModel, playableModels, slugify, type SetEntry } from "./catalog";
import { SetsIndex } from "./catalog-schema";
import type { SearchEntry } from "./search";
import { themeName } from "@/i18n/themes-fr";
import type { Locale } from "@/i18n/types";

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

/** Couverture dessinée par `npm run data:covers` (absente tant que le script n'a pas tourné pour ce set). */
export const coverPath = (number: string) => `data/covers/${number}.webp`;
/** Carte de partage (1200 × 630) dessinée avec la couverture. */
export const cardPath = (number: string) => `data/covers/${number}-partage.jpg`;

const exists = new Map<string, boolean>();
const publicFile = (rel: string) => {
  let hit = exists.get(rel);
  if (hit === undefined) exists.set(rel, (hit = existsSync(path.join(process.cwd(), "public", rel))));
  return hit;
};
export const hasCover = (number: string) => publicFile(coverPath(number));
export const hasCard = (number: string) => publicFile(cardPath(number));

/** Le modèle principal a de vraies étapes (sinon la fiche dit « Sans étapes de montage »). */
export const hasSteps = (set: SetEntry) => defaultModel(set).status !== "sans-etapes";

/** Index de la recherche, dans une langue : une entrée courte par set, avec le thème dans cette langue. */
export function searchEntries(locale: Locale = "fr"): SearchEntry[] {
  const other: Locale = locale === "fr" ? "en" : "fr";
  return allSets().map((s) => {
    const m = defaultModel(s);
    const h = s.theme ? themeName(s.theme, locale) : null;
    // le thème reste cherchable sous ses autres noms (« Town » trouve les sets « Ville », et l'inverse)
    const a = [...new Set(s.themePath.flatMap((t) => [t, themeName(t, other)]).filter((t) => t !== themeName(t, locale)))].join(" ") || undefined;
    return { n: s.number, t: s.name, h, ...(a ? { a } : {}), y: s.year, p: m.parts, s: m.steps, e: m.status !== "sans-etapes", c: hasCover(s.number) };
  });
}

/** Un thème de premier niveau, sous son nom dans la langue de la page ; plusieurs thèmes d'origine peuvent s'y retrouver. */
export type Theme = { name: string; slug: string; count: number };

/** Adresse d'un thème : son nom dans la langue de la page, sans la marque (jamais dans une URL). */
export const themeSlug = (name: string) => slugify(name.replace(/\blego(land)?\b®?/gi, " ")) || "theme";

/** Thème de premier niveau d'un set, dans une langue. */
export const setTheme = (s: SetEntry, locale: Locale = "fr") => (s.theme ? themeName(s.theme, locale) : null);

/** Thèmes de premier niveau, du plus fourni au moins fourni. */
export function allThemes(locale: Locale = "fr"): Theme[] {
  const counts = new Map<string, number>();
  for (const s of allSets()) {
    const t = setTheme(s, locale);
    if (t) counts.set(t, (counts.get(t) ?? 0) + 1);
  }
  return [...counts]
    .map(([name, count]) => ({ name, slug: themeSlug(name), count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, locale));
}

export function findTheme(slug: string, locale: Locale = "fr"): Theme | undefined {
  return allThemes(locale).find((t) => t.slug === slug);
}

/** Le même thème dans l'autre langue (pour les liens entre versions d'une page de thème). */
export function themeIn(slug: string, from: Locale, to: Locale): Theme | undefined {
  const set = allSets().find((s) => s.theme && themeSlug(themeName(s.theme, from)) === slug);
  return set?.theme ? findTheme(themeSlug(themeName(set.theme, to)), to) : undefined;
}

/** Paramètres des pages de thème ; un exemple fictif si le catalogue est vide, pour que le build passe. */
export function themeParams(locale: Locale = "fr"): { theme: string }[] {
  const themes = allThemes(locale);
  return themes.length ? themes.map((t) => ({ theme: t.slug })) : [{ theme: "exemple" }];
}

/**
 * Sets à proposer sur l'accueil, par thème : une réserve de sets faciles à monter (30 à 400 pièces,
 * avec étapes et couverture), dans laquelle la page en tire quatre au hasard à chaque visite. Les plus
 * petits d'abord ; si un thème en a trop peu, la réserve se complète avec ses autres sets complets.
 */
export function featuredByTheme(locale: Locale = "fr", themeCount = 4, poolSize = 16): { theme: Theme; sets: SetEntry[] }[] {
  const size = (s: SetEntry) => defaultModel(s).parts;
  const easy = (s: SetEntry) => size(s) >= 30 && size(s) <= 400;
  return allThemes(locale)
    .slice(0, themeCount)
    .map((theme) => ({
      theme,
      sets: allSets()
        .filter((s) => setTheme(s, locale) === theme.name && defaultModel(s).status === "ok")
        .sort((a, b) => Number(easy(b)) - Number(easy(a)) || Number(hasCover(b.number)) - Number(hasCover(a.number)) || size(a) - size(b))
        .slice(0, poolSize),
    }))
    .filter((g) => g.sets.length > 0);
}

/** Année du plus ancien set du catalogue. */
export function firstYear(): number | null {
  const years = allSets().flatMap((s) => (s.year ? [s.year] : []));
  return years.length ? Math.min(...years) : null;
}
