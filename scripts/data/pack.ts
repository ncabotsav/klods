/**
 * npm run data:pack
 *
 * Pour chaque modèle OMR téléchargé : intègre les pièces de la bibliothèque LDraw (packer), compresse
 * le résultat en gzip et l'écrit dans public/data/models/<set>/<modele>.mpd.gz, servi avec le site.
 * Le navigateur le décompresse avec DecompressionStream.
 */
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { gzipSync } from "node:zlib";
import { packModel } from "./lib/ldraw-pack.ts";
import type { OmrSet } from "./lib/omr-parse.ts";
import { BUILD, LDRAW_LIBRARY, OMR_SETS_JSON, PACK_REPORT, PUBLIC_MODELS, ROOT, omrModelFile } from "./lib/paths.ts";
import { slugify } from "../../src/lib/catalog.ts";

export type PackEntry = {
  omrId: number;
  number: string;
  fileId: number;
  slug: string;
  /** Chemin publié, relatif à public/ */
  file: string;
  bytes: number;
  bytesGz: number;
  missing: string[];
  error?: string;
};

/** « Main Model » devient « principal » ; les autres modèles prennent leur nom. */
export const modelSlug = (name: string) => (/^main model$/i.test(name.trim()) ? "principal" : slugify(name));

const readLibrary = (p: string) => {
  try {
    return fs.readFileSync(path.join(LDRAW_LIBRARY, p), "utf8");
  } catch {
    return null;
  }
};

async function main() {
  const sets: OmrSet[] = JSON.parse(await fsp.readFile(OMR_SETS_JSON, "utf8"));
  const ldconfig = await fsp.readFile(path.join(LDRAW_LIBRARY, "LDConfig.ldr"), "utf8");
  await fsp.rm(PUBLIC_MODELS, { recursive: true, force: true });

  const report: PackEntry[] = [];
  let done = 0;
  const total = sets.reduce((n, s) => n + s.models.length, 0);
  for (const set of sets) {
    const used = new Set<string>();
    for (const m of set.models) {
      let slug = modelSlug(m.name);
      while (used.has(slug)) slug += "-2";
      used.add(slug);
      const file = `data/models/${slugify(set.number)}/${slug}.mpd.gz`;
      const entry: PackEntry = { omrId: set.omrId, number: set.number, fileId: m.fileId, slug, file, bytes: 0, bytesGz: 0, missing: [] };
      try {
        const source = await fsp.readFile(omrModelFile(m), "utf8");
        const packed = packModel(source, ldconfig, readLibrary);
        const gz = gzipSync(packed.text, { level: 9 });
        const out = path.join(ROOT, "public", file);
        await fsp.mkdir(path.dirname(out), { recursive: true });
        await fsp.writeFile(out, gz);
        entry.bytes = Buffer.byteLength(packed.text);
        entry.bytesGz = gz.length;
        entry.missing = packed.missing;
      } catch (err) {
        entry.error = (err as Error).message;
      }
      report.push(entry);
      if (++done % 200 === 0) console.log(`  ${done}/${total} modèles packés`);
    }
  }

  await fsp.mkdir(BUILD, { recursive: true });
  await fsp.writeFile(PACK_REPORT, JSON.stringify(report, null, 1));
  const mb = (n: number) => (n / 1e6).toFixed(1);
  const raw = report.reduce((n, e) => n + e.bytes, 0);
  const gz = report.reduce((n, e) => n + e.bytesGz, 0);
  const withMissing = report.filter((e) => e.missing.length).length;
  const errors = report.filter((e) => e.error);
  console.log(`Pack : ${report.length} modèles, ${mb(raw)} Mo bruts, ${mb(gz)} Mo compressés`);
  console.log(`Pack : ${withMissing} modèles avec au moins une référence introuvable, ${errors.length} erreurs`);
  for (const e of errors.slice(0, 20)) console.log(`  ${e.number} ${e.slug} : ${e.error}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
