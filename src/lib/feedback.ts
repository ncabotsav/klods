/**
 * Format d'un retour envoyé par le formulaire /retours/ à l'API /api/retours (Worker Cloudflare).
 * La même fonction valide côté navigateur (avant l'envoi) et côté Worker (à la réception).
 */

export const FEEDBACK_KINDS = ["etape", "piece", "bug", "idee"] as const;
export type FeedbackKind = (typeof FEEDBACK_KINDS)[number];

export const MESSAGE_MAX = 2000;
/** Taille maximale du corps de la requête, en octets. */
export const BODY_MAX = 8 * 1024;

export type Feedback = {
  kind: FeedbackKind;
  message: string;
  /** Pour te répondre, si tu le veux bien. */
  email?: string;
  set?: string;
  model?: string;
  step?: number;
  /** Page d'où vient le retour (chemin seulement). */
  page?: string;
};

export type FeedbackError = "kind" | "message" | "email" | "context" | "spam";

const SET = /^[0-9a-z]+(?:-[0-9a-z]+)*-\d+$/i;
const SLUG = /^[0-9a-z][0-9a-z-]{0,79}$/i;
const EMAIL = /^[^\s@<>"]{1,64}@[^\s@<>"]{1,190}\.[a-z]{2,}$/i;

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

/**
 * Valide un retour reçu tel quel (JSON). `website` est un champ caché, laissé vide par les humains :
 * rempli, c'est un robot.
 */
export function parseFeedback(input: unknown): { ok: true; value: Feedback } | { ok: false; error: FeedbackError } {
  if (!input || typeof input !== "object") return { ok: false, error: "message" };
  const o = input as Record<string, unknown>;
  if (str(o.website)) return { ok: false, error: "spam" };
  const kind = str(o.kind) as FeedbackKind;
  if (!FEEDBACK_KINDS.includes(kind)) return { ok: false, error: "kind" };
  const message = str(o.message).replace(/\r\n/g, "\n");
  if (message.length < 3 || message.length > MESSAGE_MAX) return { ok: false, error: "message" };
  const value: Feedback = { kind, message };

  const email = str(o.email);
  if (email) {
    if (!EMAIL.test(email)) return { ok: false, error: "email" };
    value.email = email;
  }
  const set = str(o.set);
  if (set) {
    if (!SET.test(set) || set.length > 40) return { ok: false, error: "context" };
    value.set = set;
  }
  const model = str(o.model);
  if (model) {
    if (!SLUG.test(model)) return { ok: false, error: "context" };
    value.model = model;
  }
  if (o.step !== undefined && o.step !== null && o.step !== "") {
    const step = Number(o.step);
    if (!Number.isInteger(step) || step < 1 || step > 10_000) return { ok: false, error: "context" };
    value.step = step;
  }
  const page = str(o.page);
  if (page) {
    if (!page.startsWith("/") || page.startsWith("//") || page.length > 300) return { ok: false, error: "context" };
    value.page = page;
  }
  return { ok: true, value };
}

/** Contexte lu dans l'adresse de /retours/ (?set=…&modele=…&etape=…&page=…&type=…). */
export function feedbackContext(search: string): Pick<Feedback, "set" | "model" | "step" | "page"> & { kind?: FeedbackKind } {
  const q = new URLSearchParams(search);
  const parsed = parseFeedback({ kind: "idee", message: "---", set: q.get("set") ?? "", model: q.get("modele") ?? "", step: q.get("etape") ?? "", page: q.get("page") ?? "" });
  const kind = q.get("type") as FeedbackKind | null;
  const ctx = parsed.ok ? { set: parsed.value.set, model: parsed.value.model, step: parsed.value.step, page: parsed.value.page } : {};
  return { ...ctx, ...(kind && FEEDBACK_KINDS.includes(kind) ? { kind } : {}) };
}

/** Adresse de /retours/ avec son contexte (sans le préfixe du site : à passer à `next/link`). */
export function feedbackHref(ctx: { set?: string; model?: string; step?: number; page?: string; kind?: FeedbackKind }): string {
  const q = new URLSearchParams();
  if (ctx.kind) q.set("type", ctx.kind);
  if (ctx.set) q.set("set", ctx.set);
  if (ctx.model) q.set("modele", ctx.model);
  if (ctx.step) q.set("etape", String(ctx.step));
  if (ctx.page) q.set("page", ctx.page);
  return `/retours/${q.size ? `?${q}` : ""}`;
}
