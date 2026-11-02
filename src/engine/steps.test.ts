import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import type { Object3D } from "three";
import { loadModelText } from "./load.ts";
import { buildSteps, isPart, type StepPlan } from "./steps.ts";

const SETS = ["4915-1", "4918-1", "4838-1", "889-1", "30051-1", "30054-1"];
const cache = new Map<string, Promise<{ model: Object3D; plan: StepPlan; stepCommands: number }>>();

function load(id: string) {
  if (!cache.has(id)) {
    cache.set(
      id,
      (async () => {
        const raw = gunzipSync(readFileSync(`fixtures/ldraw/${id}.mpd.gz`)).toString("utf8");
        const { model, info } = await loadModelText(raw, { smoothNormals: false });
        return { model, plan: buildSteps(model, info), stepCommands: info.stepCommands };
      })(),
    );
  }
  return cache.get(id)!;
}

/** Toutes les pièces de premier niveau (une pièce dans une pièce ne compte pas). */
function allParts(model: Object3D) {
  const out: Object3D[] = [];
  model.traverse((o) => {
    if (isPart(o) && !(o.parent && isPart(o.parent))) out.push(o);
  });
  return out;
}

for (const id of SETS) {
  test(`${id} : aucune étape vide, chaque pièce posée une seule fois`, async () => {
    const { model, plan } = await load(id);
    assert.ok(plan.steps.length > 1, "plus d'une étape");
    for (const s of plan.steps) assert.ok(s.parts.length + s.assemblies.length > 0, `étape ${s.index} vide`);

    // chaque pièce est posée directement par une étape, ou appartient à un sous-ensemble posé par une étape
    const placed = new Set<Object3D>();
    for (const s of plan.steps) {
      for (const p of s.parts) placed.add(p);
      for (const a of s.assemblies) a.traverse((o) => isPart(o) && placed.add(o));
    }
    const parts = allParts(model);
    for (const p of parts) assert.ok(placed.has(p), `pièce ${p.userData.fileName} jamais posée`);
    assert.equal(plan.totalParts, parts.length);

    // une pièce n'est posée directement qu'une fois
    const direct = plan.steps.flatMap((s) => s.parts);
    assert.equal(new Set(direct).size, direct.length);
  });

  test(`${id} : un sous-ensemble est construit avant d'être posé`, async () => {
    const { plan } = await load(id);
    for (const s of plan.steps) {
      for (const a of s.assemblies) {
        const letter = plan.assemblyLetters.get(String(a.userData.fileName).toLowerCase());
        const buildSteps = plan.steps.filter((b) => b.assembly === letter);
        assert.ok(buildSteps.length > 0, `sous-ensemble ${letter} jamais construit`);
        assert.ok(buildSteps[0].index < s.index, `sous-ensemble ${letter} posé avant d'être construit`);
      }
    }
  });
}

test("4915-1 : les côtés servent deux fois, construits une seule fois", async () => {
  const { plan } = await load("4915-1");
  const side = [...plan.assemblyLetters.entries()].find(([name]) => name.includes("side"));
  assert.ok(side, "sous-ensemble Side trouvé");
  const steps = plan.steps.filter((s) => s.assembly === side![1]);
  assert.ok(steps.length > 0);
  assert.ok(steps.every((s) => s.repeat === 2), "à construire 2 fois");
});

test("889-1 : les ROTSTEP deviennent des étapes, avec leur angle de vue", async () => {
  const { plan, stepCommands } = await load("889-1");
  assert.ok(stepCommands >= 6);
  assert.ok(plan.steps.some((s) => s.rotation !== null), "au moins une étape avec un angle de vue");
});

test("30051-1 : un modèle à ROTSTEP a autant d'étapes que de commandes, à peu près", async () => {
  const { plan, stepCommands } = await load("30051-1");
  assert.ok(plan.steps.length >= stepCommands - 3, `${plan.steps.length} étapes pour ${stepCommands} commandes`);
});

test("ROTSTEP : ABS fixe, REL part de la vue par défaut, ADD s'ajoute, END revient au défaut", async () => {
  const { readModelText } = await import("./ldraw-text.ts");
  const info = readModelText(
    [
      "1 4 0 0 0 1 0 0 0 1 0 0 0 1 a.dat",
      "0 ROTSTEP 35 55 0 ABS",
      "1 4 0 0 0 1 0 0 0 1 0 0 0 1 b.dat",
      "0 ROTSTEP 0 10 0 ADD",
      "1 4 0 0 0 1 0 0 0 1 0 0 0 1 c.dat",
      "1 4 0 0 0 1 0 0 0 1 0 0 0 1 d.dat",
      "0 ROTSTEP 10 0 0 REL",
      "1 4 0 0 0 1 0 0 0 1 0 0 0 1 e.dat",
      "0 ROTSTEP END",
      "1 4 0 0 0 1 0 0 0 1 0 0 0 1 f.dat",
    ].join("\n"),
  );
  assert.deepEqual(
    info.references.get("")!.map((r) => r.rotation),
    [null, [35, 55, 0], [35, 65, 0], [35, 65, 0], [33, -45, 0], null],
  );
  assert.equal(info.stepCommands, 4);
  assert.doesNotMatch(info.text, /ROTSTEP/);
});

test("une ligne de pièce sans nom de fichier est écartée, le modèle se charge (cas réel de 40379-1)", async () => {
  const raw = gunzipSync(readFileSync("fixtures/ldraw/889-1.mpd.gz")).toString("utf8");
  const i = raw.indexOf("\n0 STEP");
  const broken = `${raw.slice(0, i)}\n1 16 0 0 0 1 0 0 0 1 0 0 0 1${raw.slice(i)}`;
  const { model, info } = await loadModelText(broken, { smoothNormals: false });
  assert.equal(info.ignoredLines, 1);
  assert.equal(buildSteps(model, info).totalParts, 35);
});

test("une référence introuvable se charge comme une pièce vide dans Node (sans ProgressEvent)", async () => {
  const raw = gunzipSync(readFileSync("fixtures/ldraw/889-1.mpd.gz")).toString("utf8");
  const i = raw.indexOf("\n0 STEP");
  const withMissing = `${raw.slice(0, i)}\n1 4 0 0 0 1 0 0 0 1 0 0 0 1 n-existe-pas.dat${raw.slice(i)}`;
  const { model, info } = await loadModelText(withMissing, { smoothNormals: false });
  assert.equal(buildSteps(model, info).totalParts, 36);
});
