import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { cleanDescription, frenchColour, frenchPartName, groupParts, stepInstruction } from "./instructions.ts";
import { loadModelText } from "./load.ts";
import { buildSteps } from "./steps.ts";

test("nettoie les descriptions LDraw", () => {
  assert.equal(cleanDescription("Plate  2 x  4"), "Plate 2 × 4");
  assert.equal(cleanDescription("~Brick  1 x  2 x  5 without Front"), "Brick 1 × 2 × 5 without Front");
});

test("traduit le premier mot et garde les dimensions", () => {
  assert.deepEqual(frenchPartName("Plate  2 x  4"), { one: "plaque 2 × 4", many: "plaques 2 × 4", full: "plaque 2 × 4", gender: "f" });
  assert.deepEqual(frenchPartName("Technic Beam  5"), { one: "poutre Technic 5", many: "poutres Technic 5", full: "poutre Technic 5", gender: "f" });
  const wheel = frenchPartName("Plate  2 x  2 with 2 Wheel Pins Extended");
  assert.equal(wheel.many, "plaques 2 × 2");
  assert.equal(wheel.full, "plaque 2 × 2 with 2 Wheel Pins Extended");
  assert.equal(frenchPartName("Slope Brick 31  1 x  1 x  0.667").one, "pente 1 × 1 × 0.667");
  assert.equal(frenchPartName("Minifig Torso with Classic Space Pattern").one, "torse de figurine");
  assert.equal(frenchPartName("Minifig Hand").many, "mains de figurine");
  assert.equal(frenchPartName("Hose Flexible 12L").many, "tuyaux");
  assert.equal(frenchPartName("Electric Motor").one, "Electric Motor");
});

test("accorde les couleurs", () => {
  assert.equal(frenchColour("Yellow", "f", true), "jaunes");
  assert.equal(frenchColour("White", "f", false), "blanche");
  assert.equal(frenchColour("White", "f", true), "blanches");
  assert.equal(frenchColour("Light_Bluish_Gray", "f", true), "gris clair");
  assert.equal(frenchColour("Trans_Red", "f", true), "rouges transparentes");
  assert.equal(frenchColour("Black", "m", true), "noirs");
  assert.equal(frenchColour("Unknown_Colour", "m", false), "unknown colour");
});

test("889-1 : bras gauche et droit dits ensemble", async () => {
  const raw = gunzipSync(readFileSync("fixtures/ldraw/889-1.mpd.gz")).toString("utf8");
  const { model, info } = await loadModelText(raw, { smoothNormals: false });
  const plan = buildSteps(model, info);
  const letterOf = (a: { userData: { fileName?: string } }) => plan.assemblyLetters.get(String(a.userData.fileName).toLowerCase());
  const text = plan.steps.map((s) => stepInstruction(s, info, letterOf)).join(" ");
  assert.match(text, /2 bras de figurine rouges/);
  assert.doesNotMatch(text, /1 bras de figurine rouge, 1 bras de figurine rouge/);
});

test("4915-1 : consignes lisibles pour chaque étape", async () => {
  const raw = gunzipSync(readFileSync("fixtures/ldraw/4915-1.mpd.gz")).toString("utf8");
  const { model, info } = await loadModelText(raw, { smoothNormals: false });
  const plan = buildSteps(model, info);
  const letterOf = (a: { userData: { fileName?: string } }) => plan.assemblyLetters.get(String(a.userData.fileName).toLowerCase());
  const texts = plan.steps.map((s) => stepInstruction(s, info, letterOf));
  for (const t of texts) assert.match(t, /^(Ajoute \d|Pose (le|les))/, t);
  assert.ok(texts.some((t) => /plaque 2 × 4 jaune/.test(t)), texts.slice(0, 5).join(" | "));
  assert.ok(texts.some((t) => /Pose le sous-ensemble [A-Z]/.test(t)));
  // pièces groupées : 3 pièces identiques donnent « 3 … », pas trois fois « 1 … »
  for (const s of plan.steps) {
    const groups = groupParts(s.parts, info);
    assert.equal(new Set(groups.map((g) => g.key)).size, groups.length);
  }
});
