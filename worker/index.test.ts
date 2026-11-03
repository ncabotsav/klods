import { test } from "node:test";
import assert from "node:assert/strict";
import worker, { handleFeedback, type Env } from "./index.ts";

function env(over: Partial<Env> = {}) {
  const stored: { key: string; value: string; options?: unknown }[] = [];
  const mails: unknown[] = [];
  const e: Env = {
    ASSETS: { fetch: async () => new Response("page") },
    RETOURS: { put: async (key, value, options) => void stored.push({ key, value, options }) },
    EMAIL: { send: async (m) => void mails.push(m) },
    FEEDBACK_TO: "moi@exemple.fr",
    ...over,
  };
  return { e, stored, mails };
}

const post = (body: unknown, headers: Record<string, string> = {}) =>
  new Request("https://klods.app/api/retours", {
    method: "POST",
    headers: { Origin: "https://klods.app", "Content-Type": "application/json", "CF-Connecting-IP": "1.2.3.4", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });

test("un retour valide est gardé un an et envoyé par e-mail, sans l'adresse IP", async () => {
  const { e, stored, mails } = env();
  const res = await handleFeedback(post({ kind: "piece", message: "La pièce 3 est rouge, pas bleue.", set: "6080-1", step: 3, email: "a@b.fr" }), e);
  assert.equal(res.status, 201);
  assert.equal(stored.length, 1);
  assert.ok(stored[0].key.startsWith("retour:"));
  assert.ok(!stored[0].value.includes("1.2.3.4"));
  assert.deepEqual((stored[0].options as { expirationTtl: number }).expirationTtl, 365 * 24 * 3600);
  const mail = mails[0] as { subject: string; text: string; replyTo: string };
  assert.equal(mail.subject, "[Klods] Pièce fausse · 6080-1 · étape 3");
  assert.ok(mail.text.includes("https://klods.app/set/6080-1/monter/?etape=3"));
  assert.equal(mail.replyTo, "a@b.fr");
});

test("les requêtes d'un autre site, mal formées ou trop nombreuses sont refusées", async () => {
  const { e, stored } = env();
  assert.equal((await handleFeedback(post({ kind: "bug", message: "bonjour" }, { Origin: "https://ailleurs.com" }), e)).status, 403);
  assert.equal((await handleFeedback(post("{pas du json"), e)).status, 400);
  assert.equal((await handleFeedback(post({ kind: "bug", message: "x".repeat(9000) }), e)).status, 413);
  assert.equal((await handleFeedback(post({ kind: "bug", message: "bonjour" }, { "Content-Type": "text/plain" }), e)).status, 415);
  const limited = env({ LIMITE: { limit: async () => ({ success: false }) } });
  assert.equal((await handleFeedback(post({ kind: "bug", message: "bonjour" }), limited.e)).status, 429);
  assert.equal(stored.length, 0);
});

test("un robot reçoit une réponse normale, mais rien n'est gardé", async () => {
  const { e, stored } = env();
  assert.equal((await handleFeedback(post({ kind: "bug", message: "bonjour", website: "x" }), e)).status, 201);
  assert.equal(stored.length, 0);
});

test("un e-mail en échec n'empêche pas de garder le retour", async () => {
  const { e, stored } = env({ EMAIL: { send: async () => Promise.reject(new Error("non vérifiée")) } });
  const warn = console.warn;
  console.warn = () => {};
  try {
    assert.equal((await handleFeedback(post({ kind: "bug", message: "bonjour" }), e)).status, 201);
  } finally {
    console.warn = warn;
  }
  assert.equal(stored.length, 1);
});

test("le Worker ne répond qu'à /api, le reste va aux fichiers statiques", async () => {
  const { e } = env();
  assert.equal((await worker.fetch(new Request("https://klods.app/api/rien"), e)).status, 404);
  assert.equal(await (await worker.fetch(new Request("https://klods.app/"), e)).text(), "page");
  assert.equal((await worker.fetch(new Request("https://klods.app/api/retours"), e)).status, 405);
});
