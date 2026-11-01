/**
 * npm run data:rebrickable
 *
 * Télécharge les fichiers CSV publics de Rebrickable (sets et thèmes) dans data/raw/rebrickable/.
 * Rebrickable les régénère chaque jour ; on les garde en cache, DATA_REFRESH=1 les retélécharge.
 * Si le téléchargement échoue, l'index se construit quand même, avec les noms de l'OMR.
 */
import path from "node:path";
import { gunzipSync } from "node:zlib";
import fs from "node:fs/promises";
import { fetchCached } from "./lib/http.ts";
import { RAW_REBRICKABLE } from "./lib/paths.ts";

const BASE = "https://cdn.rebrickable.com/media/downloads";
const FILES = ["sets", "themes"];
const REFRESH = process.env.DATA_REFRESH === "1";

async function main() {
  for (const name of FILES) {
    try {
      const gz = path.join(RAW_REBRICKABLE, `${name}.csv.gz`);
      const res = await fetchCached(`${BASE}/${name}.csv.gz`, gz, { force: REFRESH });
      if (!res.body) throw new Error(`HTTP ${res.status}`);
      const csv = gunzipSync(res.body);
      await fs.writeFile(path.join(RAW_REBRICKABLE, `${name}.csv`), csv);
      const lines = csv.toString("utf8").split("\n").filter(Boolean).length - 1;
      console.log(`Rebrickable : ${name}.csv ${res.fromCache ? "en cache" : "téléchargé"}, ${lines} lignes`);
    } catch (err) {
      console.warn(`Rebrickable : ${name}.csv indisponible (${(err as Error).message}), l'index utilisera les noms de l'OMR`);
    }
  }
}

main();
