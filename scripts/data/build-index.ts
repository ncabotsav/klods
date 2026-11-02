/**
 * npm run data:index
 *
 * Assemble public/data/sets.json à partir des fiches OMR, du rapport de pack, du rapport de contrôle
 * et des CSV Rebrickable (nom, thème, année, nombre de pièces). Le fichier est validé par le schéma
 * de src/lib/catalog.ts avant d'être écrit.
 */
import fsp from "node:fs/promises";
import path from "node:path";
import { exists } from "./lib/http.ts";
import { parseCsv } from "./lib/csv.ts";
import type { OmrSet } from "./lib/omr-parse.ts";
import type { PackEntry } from "./pack.ts";
import type { CheckEntry } from "./check.ts";
import { CHECK_REPORT, OMR_SETS_JSON, PACK_REPORT, RAW_LDRAW, RAW_REBRICKABLE, SETS_INDEX } from "./lib/paths.ts";
import { SetsIndex, type ModelEntry, type ModelStatus, type SetEntry } from "../../src/lib/catalog-schema.ts";

async function readCsv(name: string) {
  const file = path.join(RAW_REBRICKABLE, `${name}.csv`);
  return (await exists(file)) ? parseCsv(await fsp.readFile(file, "utf8")) : [];
}

async function main() {
  const omr: OmrSet[] = JSON.parse(await fsp.readFile(OMR_SETS_JSON, "utf8"));
  const pack: PackEntry[] = JSON.parse(await fsp.readFile(PACK_REPORT, "utf8"));
  const check: CheckEntry[] = (await exists(CHECK_REPORT)) ? JSON.parse(await fsp.readFile(CHECK_REPORT, "utf8")) : [];
  const version = (await exists(path.join(RAW_LDRAW, "version.json")))
    ? JSON.parse(await fsp.readFile(path.join(RAW_LDRAW, "version.json"), "utf8")).libraryUpdate ?? "inconnue"
    : "inconnue";

  const rbSets = new Map((await readCsv("sets")).map((r) => [r.set_num, r]));
  const themes = new Map((await readCsv("themes")).map((t) => [t.id, t]));
  const themePath = (id: string | undefined): string[] => {
    const out: string[] = [];
    for (let t = id ? themes.get(id) : undefined; t && out.length < 6; t = t.parent_id ? themes.get(t.parent_id) : undefined) out.unshift(t.name);
    return out;
  };

  const packByFile = new Map(pack.map((p) => [`${p.omrId}:${p.fileId}`, p]));
  const checkByFile = new Map(check.filter(Boolean).map((c) => [c.file, c]));

  const sets: SetEntry[] = omr.map((s) => {
    const rb = rbSets.get(s.number);
    const tp = themePath(rb?.theme_id);
    const models: ModelEntry[] = s.models.flatMap((m, i) => {
      const p = packByFile.get(`${s.omrId}:${m.fileId}`);
      if (!p) return [];
      const c = checkByFile.get(p.file);
      const stats = c?.stats;
      let status: ModelStatus = "ok";
      if (p.error || !stats || stats.parts === 0) status = "echec";
      else if (stats.steps <= 1) status = "sans-etapes";
      else if (m.missingParts || p.missing.length) status = "incomplet";
      return [
        {
          slug: p.slug,
          name: m.name,
          main: /^main model$/i.test(m.name) || (i === 0 && !s.models.some((x) => /^main model$/i.test(x.name))),
          author: m.author,
          file: p.file,
          bytes: p.bytes,
          bytesGz: p.bytesGz,
          steps: stats?.steps ?? 0,
          parts: stats?.parts ?? 0,
          uniqueParts: stats?.uniqueParts ?? 0,
          status,
          missingParts: m.missingParts,
          missingPatterns: m.missingPatterns,
          missingStickers: m.missingStickers,
          missingFiles: p.missing.length,
        },
      ];
    });
    return {
      number: s.number,
      name: rb?.name || s.title,
      theme: tp[0] ?? null,
      themePath: tp,
      year: rb?.year ? Number(rb.year) : null,
      setParts: rb?.num_parts ? Number(rb.num_parts) : null,
      omrId: s.omrId,
      models,
    };
  });

  const index = SetsIndex.parse({ generatedAt: new Date().toISOString(), ldrawLibrary: version, sets });
  await fsp.mkdir(path.dirname(SETS_INDEX), { recursive: true });
  await fsp.writeFile(SETS_INDEX, JSON.stringify(index));

  const models = sets.flatMap((s) => s.models);
  const count = (st: ModelStatus) => models.filter((m) => m.status === st).length;
  console.log(
    `Index : ${sets.length} sets, ${models.length} modèles (ok ${count("ok")}, incomplets ${count("incomplet")}, ` +
      `sans étapes ${count("sans-etapes")}, échecs ${count("echec")}), noms Rebrickable pour ${sets.filter((s) => rbSets.has(s.number)).length} sets`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
