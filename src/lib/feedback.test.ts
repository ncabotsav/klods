import { test } from "node:test";
import assert from "node:assert/strict";
import { feedbackContext, feedbackHref, parseFeedback } from "./feedback.ts";

test("un retour complet est accepté", () => {
  const r = parseFeedback({ kind: "etape", message: "  L'étape 12 montre la pièce à l'envers.  ", email: "a@b.fr", set: "4915-1", model: "principal", step: "12", page: "/set/4915-1/monter/" });
  assert.deepEqual(r, { ok: true, value: { kind: "etape", message: "L'étape 12 montre la pièce à l'envers.", email: "a@b.fr", set: "4915-1", model: "principal", step: 12, page: "/set/4915-1/monter/" } });
});

test("les champs invalides sont refusés", () => {
  assert.deepEqual(parseFeedback({ kind: "autre", message: "bonjour" }), { ok: false, error: "kind" });
  assert.deepEqual(parseFeedback({ kind: "bug", message: "ok" }), { ok: false, error: "message" });
  assert.deepEqual(parseFeedback({ kind: "bug", message: "x".repeat(2001) }), { ok: false, error: "message" });
  assert.deepEqual(parseFeedback({ kind: "bug", message: "bonjour", email: "pas-un-mail" }), { ok: false, error: "email" });
  assert.deepEqual(parseFeedback({ kind: "bug", message: "bonjour", set: "<script>" }), { ok: false, error: "context" });
  assert.deepEqual(parseFeedback({ kind: "bug", message: "bonjour", page: "//ailleurs.com" }), { ok: false, error: "context" });
  assert.deepEqual(parseFeedback({ kind: "bug", message: "bonjour", step: 0 }), { ok: false, error: "context" });
  assert.deepEqual(parseFeedback(null), { ok: false, error: "message" });
});

test("le champ piège rempli signale un robot", () => {
  assert.deepEqual(parseFeedback({ kind: "bug", message: "bonjour", website: "http://spam" }), { ok: false, error: "spam" });
});

test("le contexte fait l'aller-retour par l'adresse", () => {
  const href = feedbackHref({ kind: "piece", set: "6080-1", model: "principal", step: 3 });
  assert.equal(href, "/retours/?type=piece&set=6080-1&modele=principal&etape=3");
  assert.deepEqual(feedbackContext(href.slice(href.indexOf("?"))), { set: "6080-1", model: "principal", step: 3, page: undefined, kind: "piece" });
  assert.deepEqual(feedbackContext("?set=%3Cb%3E"), {});
});
