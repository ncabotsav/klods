/**
 * npm run data:fixtures
 *
 * Construit public/data à partir des six modèles de fixtures/ldraw, sans rien télécharger :
 * de quoi développer et tester le site en local quand le pipeline complet n'a pas tourné.
 */
import fsp from "node:fs/promises";
import path from "node:path";
import { gunzipSync } from "node:zlib";
import { analyzeModel } from "./lib/ldraw-analyze.ts";
import { PUBLIC_MODELS, ROOT, SETS_INDEX } from "./lib/paths.ts";
import { SetsIndex, slugify, type SetEntry } from "../../src/lib/catalog.ts";

const SETS: { number: string; name: string; theme: string; themePath: string[]; year: number; author: string }[] = [
  { number: "4915-1", name: "Mini Construction", theme: "Creator", themePath: ["Creator", "Creator 3-in-1"], year: 2007, author: "Ken Drew [Ken]" },
  { number: "4918-1", name: "Mini Flyers", theme: "Creator", themePath: ["Creator", "Creator 3-in-1"], year: 2007, author: "Ken Drew [Ken]" },
  { number: "4838-1", name: "Mini Vehicles", theme: "Creator", themePath: ["Creator", "Creator 3-in-1"], year: 2008, author: "Ken Drew [Ken]" },
  { number: "889-1", name: "Radar Truck", theme: "Space", themePath: ["Space", "Classic Space"], year: 1979, author: "Willy Tschager [Holly-Wood]" },
  { number: "30051-1", name: "X-wing Fighter - Mini", theme: "Star Wars", themePath: ["Star Wars"], year: 2010, author: "Jude Parrill" },
  { number: "30054-1", name: "AT-ST - Mini", theme: "Star Wars", themePath: ["Star Wars"], year: 2011, author: "Jude Parrill" },
];

async function main() {
  await fsp.rm(PUBLIC_MODELS, { recursive: true, force: true });
  const sets: SetEntry[] = [];
  for (const s of SETS) {
    const gz = await fsp.readFile(path.join(ROOT, "fixtures", "ldraw", `${s.number}.mpd.gz`));
    const text = gunzipSync(gz).toString("utf8");
    const stats = await analyzeModel(text);
    const file = `data/models/${slugify(s.number)}/principal.mpd.gz`;
    await fsp.mkdir(path.join(ROOT, "public", path.dirname(file)), { recursive: true });
    await fsp.writeFile(path.join(ROOT, "public", file), gz);
    sets.push({
      number: s.number,
      name: s.name,
      theme: s.theme,
      themePath: s.themePath,
      year: s.year,
      setParts: null,
      omrId: 0,
      models: [
        {
          slug: "principal",
          name: "Main Model",
          main: true,
          author: s.author,
          file,
          bytes: Buffer.byteLength(text),
          bytesGz: gz.length,
          steps: stats.steps,
          parts: stats.parts,
          uniqueParts: stats.uniqueParts,
          status: stats.steps > 1 ? "ok" : "sans-etapes",
          missingParts: false,
          missingPatterns: false,
          missingStickers: false,
          missingFiles: 0,
        },
      ],
    });
  }
  const index = SetsIndex.parse({ generatedAt: new Date().toISOString(), ldrawLibrary: "fixtures", sets });
  await fsp.writeFile(SETS_INDEX, JSON.stringify(index));
  console.log(`Fixtures : ${sets.length} sets écrits dans public/data`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
