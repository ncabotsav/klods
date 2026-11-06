import type { SearchEntry } from "./search";

/**
 * Sets connus de Rebrickable mais sans modèle 3D dans l'OMR (donc pas sur Klods).
 * La recherche les montre à part, avec un lien vers la notice officielle, pour qu'un set récent
 * comme 42213 ne donne pas l'impression que la recherche est cassée.
 *
 * Fichier /data/absents.json, écrit par scripts/data/build-index.ts, en tableaux courts pour
 * rester léger : { themes: ["Technic", …], sets: [["42213-1", "Ford Bronco SUV", 2025, 943, 0], …] }
 * (numéro, nom, année, pièces, index du thème de premier niveau ou -1).
 */
export type AbsentsFile = { themes: string[]; sets: [string, string, number | null, number, number][] };

export const ABSENTS_PATH = "/data/absents.json";

/** Un set n'entre dans la liste que s'il a au moins ce nombre de pièces : on écarte le matériel sans briques (livres, porte-clés…). */
export const ABSENT_MIN_PARTS = 10;

/** Entrées au format de la recherche (même moteur flou que le catalogue). */
export function absentEntries(file: AbsentsFile): SearchEntry[] {
  return file.sets.map(([n, t, y, p, h]) => ({ n, t, h: h >= 0 ? (file.themes[h] ?? null) : null, y, p, s: 0, e: false, c: false }));
}

/** Construit le fichier à partir des lignes du CSV Rebrickable des sets, sans les sets déjà sur Klods. */
export function buildAbsents(rows: { set_num: string; name: string; year: string; num_parts: string; theme?: string }[], present: Set<string>): AbsentsFile {
  const themes: string[] = [];
  const themeIndex = new Map<string, number>();
  const sets: AbsentsFile["sets"] = [];
  for (const r of rows) {
    const parts = Number(r.num_parts) || 0;
    if (present.has(r.set_num) || parts < ABSENT_MIN_PARTS || !/^\d/.test(r.set_num)) continue;
    let h = -1;
    if (r.theme) {
      if (!themeIndex.has(r.theme)) themeIndex.set(r.theme, themes.push(r.theme) - 1);
      h = themeIndex.get(r.theme)!;
    }
    sets.push([r.set_num, r.name, Number(r.year) || null, parts, h]);
  }
  return { themes, sets };
}
