/**
 * npm run data:themes
 *
 * Liste les thèmes du catalogue (public/data/sets.json), avec le nombre de sets, et signale ceux qui
 * n'ont pas encore de nom français dans src/i18n/themes-fr.ts. Écrit data/build/themes-summary.md.
 */
import fsp from "node:fs/promises";
import path from "node:path";
import { SetsIndex } from "../../src/lib/catalog-schema.ts";
import { BUILD, SETS_INDEX } from "./lib/paths.ts";
import { THEMES_FR } from "../../src/i18n/themes-fr.ts";


const index = SetsIndex.parse(JSON.parse(await fsp.readFile(SETS_INDEX, "utf8")));
const counts = new Map<string, number>();
for (const s of index.sets) for (const t of new Set(s.themePath)) counts.set(t, (counts.get(t) ?? 0) + 1);
const rows = [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
const missing = rows.filter(([t]) => !(t in THEMES_FR));
console.log(`Thèmes : ${rows.length} (dont ${missing.length} sans nom français)`);
for (const [t, n] of rows) console.log(`  ${JSON.stringify(t)}: ${n}${t in THEMES_FR ? ` → ${THEMES_FR[t]}` : ""}`);
await fsp.mkdir(BUILD, { recursive: true });
await fsp.writeFile(
  path.join(BUILD, "themes-summary.md"),
  ["## Thèmes", `- ${rows.length} thèmes, ${missing.length} sans nom français`, ...missing.map(([t, n]) => `- À traduire : ${t} (${n})`), ""].join("\n"),
);
