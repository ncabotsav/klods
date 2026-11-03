/**
 * Worker de Klods sur Cloudflare. Les pages et les modèles sont des fichiers statiques (out/), servis
 * directement par Cloudflare sans passer par ici : ce Worker ne reçoit que /api/*.
 *
 * POST /api/retours : un retour du formulaire /retours/. Validé (src/lib/feedback.ts), limité par
 * adresse IP, gardé un an dans Workers KV, puis envoyé par e-mail (Email Routing) si c'est configuré.
 * L'adresse IP n'est pas enregistrée.
 */
import { BODY_MAX, parseFeedback, type Feedback } from "../src/lib/feedback.ts";

/* Types minimaux des liaisons Cloudflare utilisées (évite d'embarquer @cloudflare/workers-types). */
type KV = { put(key: string, value: string, options?: { expirationTtl?: number; metadata?: unknown }): Promise<void> };
type RateLimit = { limit(options: { key: string }): Promise<{ success: boolean }> };
type SendEmail = { send(message: { to: string; from: string | { email: string; name: string }; subject: string; text: string; replyTo?: string }): Promise<unknown> };
type Fetcher = { fetch(request: Request): Promise<Response> };

export type Env = {
  ASSETS: Fetcher;
  RETOURS: KV;
  LIMITE?: RateLimit;
  EMAIL?: SendEmail;
  /** Adresse qui reçoit les retours (secret, vérifiée dans Email Routing). */
  FEEDBACK_TO?: string;
  FEEDBACK_FROM?: string;
};

/** Un an, en secondes : les retours plus anciens s'effacent seuls. */
const KEEP_S = 365 * 24 * 3600;

const KIND_LABEL: Record<Feedback["kind"], string> = {
  etape: "Étape pas claire",
  piece: "Pièce fausse",
  bug: "Bug",
  idee: "Idée",
};

const HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
  "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
};

const json = (status: number, body: unknown, extra: Record<string, string> = {}) => new Response(JSON.stringify(body), { status, headers: { ...HEADERS, ...extra } });

export async function handleFeedback(request: Request, env: Env, now = new Date()): Promise<Response> {
  if (request.method !== "POST") return json(405, { error: "method" }, { Allow: "POST" });
  const url = new URL(request.url);
  // seul le site lui-même peut envoyer : un navigateur joint toujours Origin à un POST
  if (request.headers.get("Origin") !== url.origin) return json(403, { error: "origin" });
  if (!(request.headers.get("Content-Type") ?? "").startsWith("application/json")) return json(415, { error: "type" });

  const ip = request.headers.get("CF-Connecting-IP") ?? "inconnue";
  if (env.LIMITE && !(await env.LIMITE.limit({ key: `retours:${ip}` })).success) return json(429, { error: "limit" }, { "Retry-After": "60" });

  const raw = await request.text();
  if (new TextEncoder().encode(raw).length > BODY_MAX) return json(413, { error: "size" });
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return json(400, { error: "json" });
  }
  const parsed = parseFeedback(data);
  // un robot pris au piège reçoit la même réponse qu'un humain, sans que rien ne soit gardé
  if (!parsed.ok && parsed.error === "spam") return json(201, { ok: true });
  if (!parsed.ok) return json(400, { error: parsed.error });

  const fb = parsed.value;
  const record = { ...fb, at: now.toISOString(), agent: (request.headers.get("User-Agent") ?? "").slice(0, 200) };
  const id = `${now.toISOString()}-${crypto.randomUUID().slice(0, 8)}`;
  await env.RETOURS.put(`retour:${id}`, JSON.stringify(record), { expirationTtl: KEEP_S, metadata: { kind: fb.kind, set: fb.set ?? null } });

  if (env.EMAIL && env.FEEDBACK_TO) {
    try {
      await env.EMAIL.send({
        to: env.FEEDBACK_TO,
        from: { email: env.FEEDBACK_FROM ?? "retours@klods.app", name: "Klods" },
        subject: `[Klods] ${KIND_LABEL[fb.kind]}${fb.set ? ` · ${fb.set}` : ""}${fb.step ? ` · étape ${fb.step}` : ""}`,
        text: feedbackEmail(fb, url.origin, id),
        ...(fb.email ? { replyTo: fb.email } : {}),
      });
    } catch (err) {
      // le retour est déjà gardé : l'e-mail n'est qu'un signal
      console.warn("e-mail de retour non envoyé", String(err));
    }
  }
  return json(201, { ok: true });
}

export function feedbackEmail(fb: Feedback, origin: string, id: string): string {
  const where: string[] = [];
  if (fb.set) {
    const q = new URLSearchParams();
    if (fb.model) q.set("modele", fb.model);
    if (fb.step) q.set("etape", String(fb.step));
    where.push(`Set : ${fb.set}${fb.model ? ` (${fb.model})` : ""}${fb.step ? `, étape ${fb.step}` : ""}`, `${origin}/set/${fb.set}/monter/${q.size ? `?${q}` : ""}`);
  }
  if (fb.page) where.push(`Page : ${origin}${fb.page}`);
  return [`${KIND_LABEL[fb.kind]}`, "", fb.message, "", ...where, fb.email ? `Réponse possible à : ${fb.email}` : "Pas d'adresse pour répondre.", "", `Référence : ${id}`].join("\n");
}

const worker = {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { pathname } = new URL(request.url);
    if (pathname === "/api/retours" || pathname === "/api/retours/") return handleFeedback(request, env);
    if (pathname.startsWith("/api/")) return json(404, { error: "not-found" });
    return env.ASSETS.fetch(request);
  },
};

export default worker;
