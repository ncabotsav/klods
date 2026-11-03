/** Utilitaire sans dépendance, partagé par les cartes de partage (navigateur) et testé dans Node. */

/** Coupe un texte en lignes de largeur `width`, au plus `max` (la dernière finit par « … »). */
export function wrapText(measure: (s: string) => number, text: string, width: number, max: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (measure(next) <= width || !line) line = next;
    else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  if (lines.length <= max) return lines;
  const kept = lines.slice(0, max);
  let last = kept[max - 1];
  while (measure(`${last}…`) > width && last.includes(" ")) last = last.slice(0, last.lastIndexOf(" "));
  kept[max - 1] = `${last}…`;
  return kept;
}
