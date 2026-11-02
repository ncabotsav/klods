/**
 * Petit serveur statique pour les tests de bout en bout : sert out/ sous /klods, comme GitHub Pages.
 * node scripts/serve-out.mjs [port]
 */
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { gzipSync } from "node:zlib";

const ROOT = path.resolve("out");
const BASE = "/klods";
const PORT = Number(process.argv[2] ?? 4173);
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".woff2": "font/woff2", ".txt": "text/plain", ".gz": "application/gzip", ".xml": "application/xml", ".webp": "image/webp", ".jpg": "image/jpeg", ".webmanifest": "application/manifest+json" };

createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", "http://localhost");
  if (!url.pathname.startsWith(BASE)) {
    res.writeHead(404).end();
    return;
  }
  let file = path.join(ROOT, decodeURIComponent(url.pathname.slice(BASE.length)));
  if (!file.startsWith(ROOT)) {
    res.writeHead(403).end();
    return;
  }
  try {
    if ((await stat(file)).isDirectory()) file = path.join(file, "index.html");
    const type = TYPES[path.extname(file)] ?? "application/octet-stream";
    const body = await readFile(file);
    // comme GitHub Pages : les fichiers texte partent compressés
    if (/text|javascript|json|svg|xml|manifest/.test(type) && /gzip/.test(req.headers["accept-encoding"] ?? "")) {
      res.writeHead(200, { "Content-Type": type, "Content-Encoding": "gzip", Vary: "Accept-Encoding" }).end(gzipSync(body));
    } else res.writeHead(200, { "Content-Type": type }).end(body);
  } catch {
    res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" }).end(await readFile(path.join(ROOT, "404.html")).catch(() => "404"));
  }
}).listen(PORT, () => console.log(`out/ servi sur http://localhost:${PORT}${BASE}/`));
