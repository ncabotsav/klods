/** Fil de travail du contrôle : reçoit un fichier .mpd.gz, renvoie ses statistiques ou l'erreur. */
import { parentPort } from "node:worker_threads";
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { analyzeModel } from "./ldraw-analyze.ts";

// LDrawLoader prévient pour chaque fichier introuvable : déjà compté par le packer, inutile ici
console.warn = () => {};
// une promesse rejetée après coup par le chargeur ne doit pas tuer le fil (le résultat est déjà envoyé)
process.on("unhandledRejection", () => {});

parentPort?.on("message", async ({ id, file }: { id: number; file: string }) => {
  try {
    const text = gunzipSync(readFileSync(file)).toString("utf8");
    parentPort?.postMessage({ id, stats: await analyzeModel(text) });
  } catch (err) {
    parentPort?.postMessage({ id, error: (err as Error).message ?? String(err) });
  }
});
