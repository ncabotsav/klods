import { test } from "node:test";
import assert from "node:assert/strict";
import { BREAK_MS, addActiveTime, followedEnough, formatDuration } from "./progress.ts";

test("le temps de montage ignore les pauses", () => {
  let p = { activeMs: 0, lastAt: 0 };
  p = addActiveTime(p, 1_000); // première action : rien à compter
  assert.equal(p.activeMs, 0);
  p = addActiveTime(p, 61_000); // une minute plus tard
  assert.equal(p.activeMs, 60_000);
  p = addActiveTime(p, 61_000 + BREAK_MS + 1); // une pause
  assert.equal(p.activeMs, 60_000);
  p = addActiveTime(p, 61_000 + BREAK_MS + 1 + 30_000);
  assert.equal(p.activeMs, 90_000);
});

test("un montage suivi à 90 % compte comme fait", () => {
  assert.equal(followedEnough([0, 1, 2, 3, 4, 5, 6, 7, 8], 10), true);
  assert.equal(followedEnough([0, 9], 10), false);
  assert.equal(followedEnough([0, 0, 1, 1], 3), false);
});

test("durées lisibles", () => {
  assert.equal(formatDuration(25 * 60_000), "25 min");
  assert.equal(formatDuration(95 * 60_000), "1 h 35");
  assert.equal(formatDuration(120 * 60_000), "2 h");
  assert.equal(formatDuration(5_000), "1 min");
});

test("retirer un montage puis l'annuler", async () => {
  // localStorage minimal pour Node
  const data = new Map<string, string>();
  (globalThis as { window?: unknown }).window = {
    localStorage: { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => data.set(k, v) },
    addEventListener() {},
    removeEventListener() {},
  };
  const { getSnapshot, inProgress, removeProgress, restoreProgress, updateProgress } = await import("./progress.ts");
  const base = { number: "4915-1", model: "principal", name: "Mini Construction", modelName: "Modèle principal", steps: 42 };
  updateProgress(base, () => ({ step: 5 }));
  assert.equal(inProgress(getSnapshot()).length, 1);
  const removed = removeProgress("4915-1", "principal");
  assert.equal(removed?.step, 5);
  assert.equal(inProgress(getSnapshot()).length, 0);
  assert.equal(removeProgress("4915-1", "principal"), undefined);
  restoreProgress(removed!);
  assert.equal(inProgress(getSnapshot())[0]?.step, 5);
  delete (globalThis as { window?: unknown }).window;
});

test("atelier : terminés, chiffres, sauvegarde et reprise sur un autre appareil", async () => {
  const data = new Map<string, string>();
  (globalThis as { window?: unknown }).window = {
    localStorage: { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => data.set(k, v) },
    addEventListener() {},
    removeEventListener() {},
  };
  const { getSnapshot, finishedBuilds, workshopTotals, exportProgress, importProgress, updateProgress } = await import("./progress.ts");
  const a = { number: "4915-1", model: "principal", name: "Mini Construction", modelName: "Modèle principal", steps: 10 };
  const b = { number: "6080-1", model: "principal", name: "King's Castle", modelName: "Modèle principal", steps: 80 };
  updateProgress(a, () => ({ step: 9, seen: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], activeMs: 600_000, finishedAt: 2000, finishedMs: 600_000 }), 2000);
  updateProgress(b, () => ({ step: 4, seen: [0, 1, 2, 3, 4], activeMs: 300_000 }), 3000);
  assert.deepEqual(finishedBuilds(getSnapshot()).map((p) => p.number), ["4915-1"]);
  assert.deepEqual(workshopTotals(getSnapshot()), { finished: 1, steps: 15, activeMs: 900_000 });

  const saved = exportProgress(getSnapshot());
  data.clear();
  updateProgress(b, () => ({ step: 20, seen: [20] }), 9000); // plus récent sur ce nouvel appareil
  assert.equal(importProgress(saved), 1);
  assert.equal(getSnapshot()["6080-1/principal"].step, 20);
  assert.equal(getSnapshot()["4915-1/principal"].finishedMs, 600_000);
  assert.equal(importProgress("pas un fichier"), null);
  assert.equal(importProgress('{"format":"autre","builds":[]}'), null);
  delete (globalThis as { window?: unknown }).window;
});
