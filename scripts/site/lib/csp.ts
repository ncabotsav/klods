import { createHash } from "node:crypto";

/** Domaines de la mesure d'audience Cloudflare (script et envoi des mesures). */
export const ANALYTICS_SCRIPT = "https://static.cloudflareinsights.com";
export const ANALYTICS_BEACON = "https://cloudflareinsights.com";

/** Types de `<script>` qui s'exécutent : les autres (JSON-LD, données) ne sont pas concernés par la CSP. */
const JS_TYPES = new Set(["", "text/javascript", "application/javascript", "module"]);

/** Contenu des scripts en ligne exécutables d'une page HTML, tels qu'écrits dans le fichier. */
export function inlineScripts(html: string): string[] {
  const out: string[] = [];
  for (const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    const attrs = m[1];
    if (/\ssrc\s*=/i.test(attrs)) continue;
    const type = /\stype\s*=\s*["']?([^"'\s>]+)/i.exec(attrs)?.[1]?.toLowerCase() ?? "";
    if (!JS_TYPES.has(type)) continue;
    out.push(m[2]);
  }
  return out;
}

export const sha256 = (text: string) => `'sha256-${createHash("sha256").update(text, "utf8").digest("base64")}'`;

/**
 * Politique de la page : rien d'extérieur sauf la mesure d'audience, et seuls les scripts en ligne
 * de ce fichier (par leur empreinte). Les styles en ligne restent permis : React pose des `style=""`.
 */
export function pagePolicy(html: string): string {
  const hashes = [...new Set(inlineScripts(html).map(sha256))];
  return [
    "default-src 'self'",
    `script-src 'self' ${[...hashes, ANALYTICS_SCRIPT].join(" ")}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    `connect-src 'self' ${ANALYTICS_BEACON}`,
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ].join("; ");
}

/** Pose la politique en `<meta>` tout en haut du `<head>`, avant le premier script. */
export function withPolicy(html: string): string {
  if (html.includes('http-equiv="Content-Security-Policy"')) return html;
  const meta = `<meta http-equiv="Content-Security-Policy" content="${pagePolicy(html)}"/>`;
  const at = html.search(/<head[^>]*>/i);
  if (at < 0) return html;
  const end = html.indexOf(">", at) + 1;
  return html.slice(0, end) + meta + html.slice(end);
}
