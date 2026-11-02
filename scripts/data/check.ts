/**
 * npm run check
 *
 * Charge chaque modèle packé avec LDrawLoader, comme le fera le site, et compte ses étapes et ses
 * pièces. Plusieurs modèles en parallèle (un par cœur), avec un délai maximum par modèle.
 * Écrit data/build/check-report.json et un résumé lisible data/build/check-summary.md.
 *
 * Échoue (code de sortie 1) si moins de CHECK_MIN_PASS % des modèles se chargent (95 par défaut).
 */
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Worker } from "node:worker_threads";
import type { ModelStats } from "./lib/ldraw-analyze.ts";
import type { PackEntry } from "./pack.ts";
import { CHECK_REPORT, CHECK_SUMMARY, PACK_REPORT, ROOT } from "./lib/paths.ts";

const TIMEOUT_MS = Number(process.env.CHECK_TIMEOUT_MS ?? 120_000);
const MIN_PASS = Number(process.env.CHECK_MIN_PASS ?? 95);
const WORKERS = Math.max(1, Math.min(Number(process.env.CHECK_WORKERS ?? os.availableParallelism()), 8));
const WORKER_FILE = new URL("./lib/check-worker.ts", import.meta.url);

export type CheckEntry = { file: string; stats?: ModelStats; error?: string; ms: number };

/**
 * Répartit les modèles entre plusieurs fils. Chaque modèle reçoit exactement un résultat : un fil qui
 * plante ou dépasse le délai est arrêté et remplacé, et un résultat déjà noté n'est jamais réécrit.
 */
function runAll(files: string[]): Promise<CheckEntry[]> {
  const results: CheckEntry[] = new Array(files.length);
  const recorded = new Set<number>();
  let next = 0;
  return new Promise((resolve) => {
    const record = (id: number, entry: CheckEntry) => {
      if (recorded.has(id)) return;
      recorded.add(id);
      results[id] = entry;
      if (recorded.size % 200 === 0) console.log(`  ${recorded.size}/${files.length} modèles contrôlés`);
      if (recorded.size === files.length) resolve(results);
    };

    const start = () => {
      if (next >= files.length) return;
      const worker = new Worker(WORKER_FILE);
      let current = -1;
      let t0 = 0;
      let timer: NodeJS.Timeout | undefined;
      let retired = false;

      // ce fil ne sert plus : on l'arrête, on note l'échec du modèle en cours et un fil neuf prend la suite
      const retire = (error: string) => {
        if (retired) return;
        retired = true;
        clearTimeout(timer);
        worker.removeAllListeners();
        worker.on("error", () => {});
        void worker.terminate();
        if (current >= 0) record(current, { file: files[current], error, ms: Date.now() - t0 });
        start();
      };

      const feed = () => {
        if (next >= files.length) {
          retired = true;
          void worker.terminate();
          return;
        }
        current = next++;
        t0 = Date.now();
        timer = setTimeout(() => retire(`délai dépassé (${TIMEOUT_MS / 1000} s)`), TIMEOUT_MS);
        worker.postMessage({ id: current, file: path.join(ROOT, "public", files[current]) });
      };

      worker.on("message", (msg: { id: number; stats?: ModelStats; error?: string }) => {
        if (retired || msg.id !== current) return;
        clearTimeout(timer);
        record(msg.id, { file: files[msg.id], stats: msg.stats, error: msg.error, ms: Date.now() - t0 });
        feed();
      });
      worker.on("error", (err) => retire(err.message || String(err)));
      worker.on("exit", (code) => {
        if (!retired) retire(`arrêt inattendu (code ${code})`);
      });
      feed();
    };

    if (!files.length) resolve(results);
    for (let i = 0; i < Math.min(WORKERS, files.length); i++) start();
  });
}

async function main() {
  const pack: PackEntry[] = JSON.parse(await fsp.readFile(PACK_REPORT, "utf8"));
  const files = pack.filter((e) => !e.error).map((e) => e.file);
  console.log(`Contrôle : ${files.length} modèles, ${WORKERS} en parallèle, ${TIMEOUT_MS / 1000} s maximum chacun`);
  const t0 = Date.now();
  const results = await runAll(files);
  await fsp.writeFile(CHECK_REPORT, JSON.stringify(results, null, 1));

  const loaded = results.filter((r) => r.stats && r.stats.parts > 0);
  const withSteps = loaded.filter((r) => r.stats!.steps > 1);
  const packErrors = pack.length - files.length;
  const failed = results.filter((r) => !r.stats || r.stats.parts === 0);
  const total = pack.length;
  const pct = (n: number) => (total ? ((100 * n) / total).toFixed(1) : "0");
  const gz = pack.reduce((n, e) => n + e.bytesGz, 0);
  const raw = pack.reduce((n, e) => n + e.bytes, 0);
  const slowest = [...results].sort((a, b) => b.ms - a.ms).slice(0, 5);
  const times = loaded.map((r) => r.ms).sort((a, b) => a - b);
  const pick = (q: number) => (times.length ? times[Math.min(times.length - 1, Math.floor(q * times.length))] / 1000 : 0);
  const assemblies = loaded.filter((r) => (r.stats!.assemblies ?? 0) > 0).length;

  const summary = [
    `# Contrôle des modèles`,
    ``,
    `- Modèles : ${total}`,
    `- Se chargent avec des pièces : ${loaded.length} (${pct(loaded.length)} %)`,
    `- Dont avec de vraies étapes (2 ou plus) : ${withSteps.length} (${pct(withSteps.length)} %)`,
    `- Échecs de chargement : ${failed.length}, erreurs de pack : ${packErrors}`,
    `- Avec des sous-ensembles : ${assemblies}`,
    `- Taille totale : ${(raw / 1e6).toFixed(1)} Mo bruts, ${(gz / 1e6).toFixed(1)} Mo compressés`,
    `- Chargement (Node, sans normales lissées) : médiane ${pick(0.5).toFixed(2)} s, 90 % sous ${pick(0.9).toFixed(2)} s`,
    `- Durée du contrôle : ${Math.round((Date.now() - t0) / 1000)} s`,
    ``,
    `## Les plus lents`,
    ...slowest.map((r) => `- ${r.file} : ${(r.ms / 1000).toFixed(1)} s`),
    ``,
    `## Échecs`,
    ...(failed.length ? failed.slice(0, 50).map((r) => `- ${r.file} : ${r.error ?? "aucune pièce"}`) : ["Aucun"]),
    ``,
  ].join("\n");
  await fsp.writeFile(CHECK_SUMMARY, summary);
  console.log(summary);

  const passRate = total ? (100 * loaded.length) / total : 0;
  if (passRate < MIN_PASS) {
    console.error(`Contrôle : ${passRate.toFixed(1)} % des modèles se chargent, il en faut au moins ${MIN_PASS} %`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
