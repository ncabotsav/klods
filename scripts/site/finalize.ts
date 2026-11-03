/**
 * Lancé après `next build` (npm run build) : prépare out/ pour l'hébergement.
 *
 * 1. Retire les fichiers de navigation interne (RSC, .txt) des pages de sets (fiche, montage,
 *    impression, en français et en anglais) : on y arrive par des liens simples, seul index.html
 *    sert. Cloudflare limite le nombre de fichiers par version (20 000 sur l'offre gratuite).
 * 2. Pose dans chaque page une CSP stricte : les scripts en ligne sont permis par leur empreinte.
 * 3. Vérifie le nombre de fichiers et leur taille, et échoue avant d'atteindre les limites.
 */
import fsp from "node:fs/promises";
import path from "node:path";
import { withPolicy } from "./lib/csp.ts";

const OUT = path.resolve("out");
/** Marge sous la limite de 20 000 fichiers de Cloudflare Workers (offre gratuite). */
const MAX_FILES = 19_000;
/** Limite de Cloudflare par fichier : 25 Mio. */
const MAX_BYTES = 25 * 1024 * 1024;

async function* walk(dir: string): AsyncGenerator<string> {
  for (const e of await fsp.readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else yield p;
  }
}

async function main() {
  try {
    await fsp.stat(OUT);
  } catch {
    console.error("out/ absent : lance d'abord `next build`.");
    process.exit(1);
  }
  let removed = 0;
  let pages = 0;
  let files = 0;
  const big: string[] = [];
  for await (const file of walk(OUT)) {
    const rel = path.relative(OUT, file).split(path.sep).join("/");
    if (/^(en\/)?set\/[^/]+\/(.*\/)?[^/]*\.txt$/.test(rel)) {
      await fsp.rm(file);
      removed++;
      continue;
    }
    files++;
    if (rel.endsWith(".html")) {
      const html = await fsp.readFile(file, "utf8");
      const next = withPolicy(html);
      if (next !== html) await fsp.writeFile(file, next);
      pages++;
    }
    const { size } = await fsp.stat(file);
    if (size > MAX_BYTES) big.push(`${rel} (${Math.round(size / 1024 / 1024)} Mio)`);
  }
  console.log(`out/ : ${files} fichiers, ${pages} pages avec CSP, ${removed} fichiers de navigation retirés`);
  let failed = false;
  if (files > MAX_FILES) {
    console.error(`Trop de fichiers : ${files} (limite fixée à ${MAX_FILES}, Cloudflare en accepte 20 000).`);
    failed = true;
  }
  for (const b of big) {
    console.error(`Fichier trop gros pour Cloudflare : ${b}`);
    failed = true;
  }
  if (failed) process.exit(1);
}

await main();
