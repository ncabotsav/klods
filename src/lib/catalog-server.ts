import "server-only";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { SetsIndex, defaultModel, playableModels, slugify, type SetEntry } from "./catalog";
import type { SearchEntry } from "./search";
import { themeFr } from "@/i18n/themes-fr";

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

/** Index de la recherche : une entrée courte par set. */
export function searchEntries(): SearchEntry[] {
  return allSets().map((s) => {
    const m = defaultModel(s);
    const h = s.theme ? themeFr(s.theme) : null;
    // le nom anglais du thème reste cherchable (« Town » trouve les sets « Ville »)
    const a = s.themePath.filter((t) => themeFr(t) !== t).join(" ") || undefined;
    return { n: s.number, t: s.name, h, ...(a ? { a } : {}), y: s.year, p: m.parts, s: m.steps, e: m.status !== "sans-etapes", c: hasCover(s.number) };
  });
}

/** Un thème de premier niveau, sous son nom français ; plusieurs thèmes anglais peuvent s'y retrouver. */
export type Theme = { name: string; slug: string; count: number };

/** Adresse d'un thème : son nom français, sans la marque (jamais dans une URL). */
export const themeSlug = (frName: string) => slugify(frName.replace(/\blego(land)?\b®?/gi, " ")) || "theme";

/** Nom français du thème de premier niveau d'un set. */
export const setTheme = (s: SetEntry) => (s.theme ? themeFr(s.theme) : null);

/** Thèmes de premier niveau, du plus fourni au moins fourni. */
export function allThemes(): Theme[] {
  const counts = new Map<string, number>();
  for (const s of allSets()) {
    const t = setTheme(s);
    if (t) counts.set(t, (counts.get(t) ?? 0) + 1);
  }
  return [...counts]
    .map(([name, count]) => ({ name, slug: themeSlug(name), count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "fr"));
}

export function findTheme(slug: string): Theme | undefined {
  return allThemes().find((t) => t.slug === slug);
}

/** Paramètres des pages de thème ; un exemple fictif si le catalogue est vide, pour que le build passe. */
export function themeParams(): { theme: string }[] {
  const themes = allThemes();
  return themes.length ? themes.map((t) => ({ theme: t.slug })) : [{ theme: "exemple" }];
}

/**
 * Sets à mettre en avant sur l'accueil, par thème : ceux qui ont des étapes et une couverture, de taille
 * moyenne (150 à 800 pièces : assez pour donner envie, assez léger pour s'ouvrir vite sur un téléphone),
 * les plus gros d'abord. Pas de données de popularité : la taille fait la vitrine.
 */
export function featuredByTheme(themeCount = 4, perTheme = 4): { theme: Theme; sets: SetEntry[] }[] {
  const size = (s: SetEntry) => defaultModel(s).parts;
  const showcase = (s: SetEntry) => size(s) >= 150 && size(s) <= 800;
  return allThemes()
    .slice(0, themeCount)
    .map((theme) => ({
      theme,
      sets: allSets()
        .filter((s) => setTheme(s) === theme.name && defaultModel(s).status === "ok")
        .sort((a, b) => Number(showcase(b)) - Number(showcase(a)) || Number(hasCover(b.number)) - Number(hasCover(a.number)) || size(b) - size(a))
        .slice(0, perTheme),
    }))
    .filter((g) => g.sets.length > 0);
}

/** Année du plus ancien set du catalogue. */
export function firstYear(): number | null {
  const years = allSets().flatMap((s) => (s.year ? [s.year] : []));
  return years.length ? Math.min(...years) : null;
}
