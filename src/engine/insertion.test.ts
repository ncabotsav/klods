import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import type { Object3D } from "three";
import { aligned, applyInsertions, readInsertions } from "./insertion.ts";
import { parseRefs, refKey } from "./connectors.ts";
import { loadModelText } from "./load.ts";
import { buildSteps } from "./steps.ts";

/** Les fichiers de pièces viennent des modèles de référence : on les recopie dans un petit modèle construit. */
const library = new Map<string, string>();
for (const set of ["4915-1", "4918-1", "30054-1"]) {
  const text = gunzipSync(readFileSync(`fixtures/ldraw/${set}.mpd.gz`)).toString("utf8");
  for (const block of text.split(/\n(?=0 FILE )/)) {
    const name = /^0 FILE (.+)/.exec(block)?.[1];
    if (name && !library.has(refKey(name))) library.set(refKey(name), block.trimEnd());
  }
}
function withParts(main: string): string {
  const need = new Set<string>();
  const add = (key: string) => {
    if (need.has(key) || !library.has(key)) return;
    need.add(key);
    for (const r of parseRefs(library.get(key)!).values()) for (const ref of r) add(ref.file);
  };
  for (const refs of parseRefs(main).values()) for (const r of refs) add(r.file);
  return [`0 FILE test.ldr\n${main}`, ...[...need].map((k) => library.get(k)!)].join("\n");
}

/** Charge un modèle construit et renvoie la direction d'arrivée de chaque pièce, dans l'ordre. */
async function directions(main: string) {
  const { model, info } = await loadModelText(withParts(main), { smoothNormals: false });
  const plan = buildSteps(model, info);
  const items: Object3D[] = plan.steps.flatMap((s) => [...s.parts, ...s.assemblies]);
  return items.map((o) => ({ dir: (o.userData.klodsInsert as number[]).map((x) => Math.round(x * 100) / 100), guided: o.userData.klodsGuided as boolean }));
}
const UP = [0, -1, 0];
const DOWN = [0, 1, 0];
const I = "1 0 0 0 1 0 0 0 1";

test("points d'attache alignés : tenon sous tube, axe dans un trou d'axe ; pas un voisin à côté", () => {
  const stud = { p: [10, 0, 10] as [number, number, number], a: [0, 1, 0] as [number, number, number], len: 0 };
  assert.ok(aligned(stud, { p: [0, 4, 0], a: [0, -1, 0], len: 0 })); // tube entre quatre tenons
  assert.ok(!aligned(stud, { p: [30, 0, 10], a: [0, 1, 0], len: 0 })); // le tenon d'à côté
  assert.ok(aligned({ p: [0, 10, 60], a: [0, 0, -1], len: 60 }, { p: [0, 10, 10], a: [0, 0, 1], len: 0 })); // axe long
});

test("une brique posée sur une plaque arrive par le haut", async () => {
  const d = await directions(`1 4 0 0 0 ${I} parts/3020.dat\n0 STEP\n1 14 10 -24 0 ${I} parts/3003.dat\n0 STEP\n`);
  assert.deepEqual(d[1], { dir: UP, guided: true });
});

test("une plaque fixée sous une brique arrive par le bas", async () => {
  const d = await directions(`1 14 0 0 0 ${I} parts/3003.dat\n0 STEP\n1 4 0 24 0 ${I} parts/3022.dat\n0 STEP\n`);
  assert.deepEqual(d[1], { dir: DOWN, guided: true });
});

test("une plaque lisse (sans primitive dessous) arrive par le haut", async () => {
  const d = await directions(`1 4 0 0 0 ${I} parts/3020.dat\n0 STEP\n1 15 0 -8 10 ${I} parts/3069b.dat\n0 STEP\n`);
  assert.deepEqual(d[1], { dir: UP, guided: true });
});

test("un axe glissé de côté dans une brique Technic arrive dans l'axe du trou", async () => {
  // l'axe 4519 est dessiné le long de X : on le tourne pour qu'il suive Z, et il dépasse côté +Z
  const d = await directions(`1 7 0 0 0 ${I} parts/6541.dat\n0 STEP\n1 0 0 10 30 0 0 -1 0 1 0 1 0 0 parts/4519.dat\n0 STEP\n`);
  assert.deepEqual(d[1], { dir: [0, 0, 1], guided: true });
});

test("une brique retournée posée sur une autre arrive quand même par le haut", async () => {
  // brique 2 × 2 à l'envers : ses tenons touchent les tenons du dessus de la première
  const d = await directions(`1 4 0 0 0 ${I} parts/3003.dat\n0 STEP\n1 14 0 -28 0 1 0 0 0 -1 0 0 0 -1 parts/3003.dat\n0 STEP\n`);
  assert.equal(d[1].dir[1], -1);
});

test("sur les modèles de référence, plus de 80 % des objets posés suivent un contact", async () => {
  for (const set of ["4915-1", "4918-1", "4838-1"]) {
    const { model, info } = await loadModelText(gunzipSync(readFileSync(`fixtures/ldraw/${set}.mpd.gz`)).toString("utf8"), { smoothNormals: false });
    const { insertion } = buildSteps(model, info);
    assert.ok((insertion.guided + insertion.touching) / insertion.placed > 0.8, `${set} : ${JSON.stringify(insertion)}`);
  }
});

test("les directions calculées sur une copie se posent à l'identique sur une autre (Web Worker)", async () => {
  const text = gunzipSync(readFileSync("fixtures/ldraw/889-1.mpd.gz")).toString("utf8");
  const a = await loadModelText(text, { smoothNormals: false });
  const full = buildSteps(a.model, a.info);
  const data = readInsertions(full.steps, full.insertion);
  const b = await loadModelText(text, { smoothNormals: false });
  const bare = buildSteps(b.model, b.info, { insertion: false });
  assert.ok(applyInsertions(bare.steps, data));
  assert.deepEqual(readInsertions(bare.steps, full.insertion), data);
  assert.ok(!applyInsertions(bare.steps.slice(1), data));
});
