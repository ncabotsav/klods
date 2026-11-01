/**
 * npm run data:omr
 *
 * Télécharge la fiche de chaque set OMR et le fichier LDraw de chacun de ses modèles, dans data/raw/omr/.
 * Tout est mis en cache : un second passage ne télécharge que les nouveautés.
 *
 * Variables :
 *   DATA_SAMPLE=25   ne traite que les 25 premiers sets (pour les vérifications de pull request)
 *   DATA_REFRESH=1   relit les fiches déjà en cache (pour voir les fichiers mis à jour)
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fetchCached } from "./lib/http.ts";
import { parseOmrSetPage, type OmrSet } from "./lib/omr-parse.ts";
import { parseRanges, formatRanges } from "./lib/ranges.ts";
import { BUILD, OMR_IDS_FILE, OMR_SETS_JSON, RAW_OMR_PAGES, omrModelFile as modelFile } from "./lib/paths.ts";

const BASE = "https://library.ldraw.org";
const SAMPLE = Number(process.env.DATA_SAMPLE ?? 0);
const REFRESH = process.env.DATA_REFRESH === "1";
/** Combien d'identifiants vides d'affilée on teste après le plus grand connu avant de conclure qu'il n'y a rien de neuf. */
const PROBE_MISSES = 25;

async function fetchSet(id: number): Promise<OmrSet | null> {
  const page = await fetchCached(`${BASE}/omr/sets/${id}`, path.join(RAW_OMR_PAGES, `${id}.html`), { force: REFRESH });
  if (page.status === 404 || !page.body) return null;
  return parseOmrSetPage(page.body.toString("utf8"), id);
}

async function main() {
  const known = parseRanges(await fs.readFile(OMR_IDS_FILE, "utf8"));
  const ids = SAMPLE ? known.slice(0, SAMPLE) : known;
  const sets: OmrSet[] = [];
  const problems: string[] = [];

  console.log(`OMR : ${ids.length} fiches à lire${SAMPLE ? ` (échantillon de ${SAMPLE})` : ""}`);
  for (const [i, id] of ids.entries()) {
    try {
      const set = await fetchSet(id);
      if (!set) problems.push(`fiche ${id} introuvable (404)`);
      else sets.push(set);
    } catch (err) {
      problems.push(`fiche ${id} : ${(err as Error).message}`);
    }
    if ((i + 1) % 100 === 0) console.log(`  ${i + 1}/${ids.length} fiches`);
  }

  // Sets ajoutés depuis le relevé : on avance au-delà du plus grand identifiant connu
  if (!SAMPLE) {
    let misses = 0;
    for (let id = known[known.length - 1] + 1; misses < PROBE_MISSES; id++) {
      const set = await fetchSet(id).catch(() => null);
      if (set) {
        sets.push(set);
        known.push(id);
        misses = 0;
        console.log(`  nouveau set : ${id} ${set.number}`);
      } else misses++;
    }
    await fs.writeFile(
      OMR_IDS_FILE,
      (await fs.readFile(OMR_IDS_FILE, "utf8")).replace(/^[\d,-]+$/m, formatRanges(known)),
    );
  }

  const models = sets.flatMap((s) => s.models);
  console.log(`OMR : ${sets.length} sets, ${models.length} modèles ; téléchargement des fichiers LDraw`);
  let downloaded = 0;
  for (const [i, m] of models.entries()) {
    try {
      const res = await fetchCached(m.url, modelFile(m));
      if (res.status === 404) problems.push(`fichier ${m.fileName} introuvable (404)`);
      else if (!res.fromCache) downloaded++;
    } catch (err) {
      problems.push(`fichier ${m.fileName} : ${(err as Error).message}`);
    }
    if ((i + 1) % 200 === 0) console.log(`  ${i + 1}/${models.length} fichiers`);
  }

  await fs.mkdir(BUILD, { recursive: true });
  await fs.writeFile(OMR_SETS_JSON, JSON.stringify(sets, null, 1));
  console.log(`OMR : ${downloaded} fichiers téléchargés, ${models.length - downloaded} déjà en cache`);
  if (problems.length) console.log(`OMR : ${problems.length} problèmes\n  ${problems.slice(0, 30).join("\n  ")}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
