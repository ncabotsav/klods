/** Lit une liste de plages « 1-324,326-357,359 » en tableau d'entiers triés. */
export function parseRanges(text: string): number[] {
  const out = new Set<number>();
  const body = text.replace(/#.*$/gm, ""); // commentaires : de « # » à la fin de la ligne
  for (const part of body.split(/[\s,]+/)) {
    if (!part) continue;
    const [a, b] = part.split("-").map(Number);
    if (!Number.isInteger(a)) throw new Error(`Plage invalide : ${part}`);
    const end = Number.isInteger(b) ? b : a;
    for (let i = a; i <= end; i++) out.add(i);
  }
  return [...out].sort((x, y) => x - y);
}

/** Inverse de parseRanges : [1,2,3,5] devient « 1-3,5 ». */
export function formatRanges(ids: number[]): string {
  const sorted = [...new Set(ids)].sort((x, y) => x - y);
  const parts: string[] = [];
  let start = sorted[0];
  let prev = sorted[0];
  for (const id of sorted.slice(1)) {
    if (id === prev + 1) {
      prev = id;
      continue;
    }
    parts.push(start === prev ? `${start}` : `${start}-${prev}`);
    start = prev = id;
  }
  if (start !== undefined) parts.push(start === prev ? `${start}` : `${start}-${prev}`);
  return parts.join(",");
}
