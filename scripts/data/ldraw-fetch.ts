/**
 * npm run data:ldraw
 *
 * Télécharge la bibliothèque de pièces LDraw complète (complete.zip) et la décompresse dans
 * data/raw/ldraw/ldraw/. Le fichier est gardé en cache ; DATA_REFRESH=1 force un nouveau téléchargement
 * (à faire après chaque mise à jour de la bibliothèque, environ tous les trois mois).
 */
import fs from "node:fs/promises";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fetchCached, exists } from "./lib/http.ts";
import { LDRAW_LIBRARY, RAW_LDRAW } from "./lib/paths.ts";

const URL_COMPLETE = "https://library.ldraw.org/library/updates/complete.zip";
const REFRESH = process.env.DATA_REFRESH === "1";

async function main() {
  const zip = path.join(RAW_LDRAW, "complete.zip");
  const res = await fetchCached(URL_COMPLETE, zip, { force: REFRESH });
  if (!res.body || res.body.length < 1_000_000) throw new Error(`complete.zip semble vide (${res.body?.length ?? 0} octets)`);
  console.log(`LDraw : complete.zip ${res.fromCache ? "en cache" : "téléchargé"}, ${(res.body.length / 1e6).toFixed(1)} Mo`);

  const ldconfig = path.join(LDRAW_LIBRARY, "LDConfig.ldr");
  if (REFRESH || !res.fromCache || !(await exists(ldconfig))) {
    await fs.rm(LDRAW_LIBRARY, { recursive: true, force: true });
    execFileSync("unzip", ["-q", "-o", zip, "-d", RAW_LDRAW], { stdio: "inherit" });
  }

  const config = await fs.readFile(ldconfig, "utf8");
  const update = config.match(/!LDRAW_ORG\s+Configuration\s+UPDATE\s+(\S+)/)?.[1] ?? "inconnue";
  const parts = (await fs.readdir(path.join(LDRAW_LIBRARY, "parts"))).filter((f) => f.endsWith(".dat")).length;
  await fs.writeFile(
    path.join(RAW_LDRAW, "version.json"),
    JSON.stringify({ ldconfigUpdate: update, parts, fetchedAt: new Date().toISOString() }, null, 1),
  );
  console.log(`LDraw : bibliothèque prête, ${parts} pièces, LDConfig du ${update}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
