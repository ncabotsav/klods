/**
 * Recherche floue dans le catalogue, côté navigateur : l'index tient en un petit fichier JSON
 * (une entrée par set), pas besoin de serveur. On accepte le numéro avec ou sans « -1 »,
 * le nom (anglais, comme sur Rebrickable), le thème, et une faute de frappe par mot.
 */

/** Une entrée de l'index de recherche, en clés courtes pour garder le fichier léger. */
export type SearchEntry = {
  /** numéro (« 4915-1 ») */
  n: string;
  /** nom */
  t: string;
  /** thème de premier niveau */
  h: string | null;
  /** année */
  y: number | null;
  /** pièces et étapes du modèle principal */
  p: number;
  s: number;
  /** le modèle principal a de vraies étapes (sinon : sans étapes) */
  e: boolean;
  /** une couverture dessinée existe */
  c: boolean;
};

export type SearchHit = { entry: SearchEntry; score: number };

/** Minuscules, sans accents, ponctuation remplacée par des espaces. */
export const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const tokens = (s: string) => normalize(s).split(" ").filter(Boolean);

/** Distance d'édition, arrêtée dès qu'elle dépasse `max` (on ne cherche que les petites fautes). */
export function editDistance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let best = i;
    for (let j = 1; j <= b.length; j++) {
      const v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      cur.push(v);
      if (v < best) best = v;
    }
    if (best > max) return max + 1;
    prev = cur;
  }
  return prev[b.length];
}

/** Note d'un mot de la recherche contre les mots d'un set : 0 s'il ne correspond à rien. */
function wordScore(q: string, words: string[]): number {
  let best = 0;
  for (const w of words) {
    let s = 0;
    if (w === q) s = 10;
    else if (w.startsWith(q)) s = q.length >= 2 ? 7 : 3;
    else if (q.length >= 3 && w.includes(q)) s = 4;
    else if (q.length >= 4) {
      // une faute pour un mot court, deux à partir de 7 lettres
      const max = q.length >= 7 ? 2 : 1;
      const d = editDistance(q, w, max);
      if (d <= 1) s = 5;
      else if (d <= max) s = 3;
    }
    if (s > best) best = s;
  }
  return best;
}

type Prepared = { entry: SearchEntry; words: string[]; name: string; base: string };

/** Prépare l'index une fois (mots normalisés), puis `search()` répond à chaque frappe. */
export function createSearch(entries: SearchEntry[]) {
  const prepared: Prepared[] = entries.map((entry) => {
    const base = entry.n.replace(/-\d+$/, "");
    return {
      entry,
      base,
      name: normalize(entry.t),
      words: [...tokens(entry.t), ...tokens(entry.h ?? ""), base, ...(entry.y ? [String(entry.y)] : [])],
    };
  });

  /** Les sets les plus proches de `query`, du meilleur au moins bon. */
  function search(query: string, limit = 20): SearchHit[] {
    const q = normalize(query);
    if (!q) return [];
    const hits: SearchHit[] = [];

    // un numéro (« 4915 », « 4915-1 », « 4915 1 ») : on cherche d'abord dans les numéros
    const num = /^(\d+)(?: (\d+))?$/.exec(q);
    if (num) {
      const [, base, version] = num;
      for (const p of prepared) {
        let score = 0;
        if (p.base === base) score = version ? (p.entry.n === `${base}-${version}` ? 100 : 60) : p.entry.n === `${base}-1` ? 100 : 90;
        else if (p.base.startsWith(base)) score = 70 - (p.base.length - base.length);
        if (score) hits.push({ entry: p.entry, score });
      }
      if (hits.length) return rank(hits, limit);
    }

    const qs = q.split(" ");
    for (const p of prepared) {
      let score = 0;
      let ok = true;
      for (const w of qs) {
        const s = wordScore(w, p.words);
        if (!s) {
          ok = false;
          break;
        }
        score += s;
      }
      if (!ok) continue;
      if (p.name === q) score += 20;
      else if (p.name.startsWith(q)) score += 8;
      hits.push({ entry: p.entry, score });
    }
    return rank(hits, limit);
  }

  return { search, size: entries.length };
}

/** Meilleure note d'abord ; à égalité, les sets avec étapes, puis par numéro. */
function rank(hits: SearchHit[], limit: number): SearchHit[] {
  return hits
    .sort((a, b) => b.score - a.score || Number(b.entry.e) - Number(a.entry.e) || a.entry.n.localeCompare(b.entry.n, "en", { numeric: true }))
    .slice(0, limit);
}
