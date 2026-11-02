/** Fil de travail du contrôle : reçoit un fichier .mpd.gz, renvoie ses statistiques ou l'erreur. */
import { parentPort } from "node:worker_threads";
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { analyzeModel } from "./ldraw-analyze.ts";

// LDrawLoader prévient pour chaque fichier introuvable : déjà compté par le packer, inutile ici
console.warn = () => {};
// une erreur hors de la promesse de chargement (dans un rappel du chargeur) : on la renvoie pour le modèle
// en cours plutôt que d'attendre le délai maximum, et on ignore celles qui arrivent après le résultat
let currentId = -1;
const report = (err: unknown) => {
  if (currentId < 0) return;
  parentPort?.postMessage({ id: currentId, error: `erreur du chargeur : ${(err as Error)?.message ?? String(err)}` });
  currentId = -1;
};
process.on("unhandledRejection", report);
process.on("uncaughtException", report);

parentPort?.on("message", async ({ id, file }: { id: number; file: string }) => {
  currentId = id;
  try {
    const text = gunzipSync(readFileSync(file)).toString("utf8");
    const stats = await analyzeModel(text);
    if (currentId === id) parentPort?.postMessage({ id, stats });
  } catch (err) {
    if (currentId === id) parentPort?.postMessage({ id, error: (err as Error).message ?? String(err) });
  }
  if (currentId === id) currentId = -1;
});
