/**
 * Petit serveur statique pour les tests de bout en bout : sert out/ sous /klods, comme GitHub Pages.
 * node scripts/serve-out.mjs [port]
 */
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve("out");
const BASE = "/klods";
const PORT = Number(process.argv[2] ?? 4173);
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".woff2": "font/woff2", ".txt": "text/plain", ".gz": "application/gzip" };

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
    res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] ?? "application/octet-stream" }).end(await readFile(file));
  } catch {
    res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" }).end(await readFile(path.join(ROOT, "404.html")).catch(() => "404"));
  }
}).listen(PORT, () => console.log(`out/ servi sur http://localhost:${PORT}${BASE}/`));
