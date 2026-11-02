/**
 * npm run data:covers
 *
 * Dessine la couverture (640 × 480, WebP transparent) et la carte de partage (1200 × 630, JPEG) de
 * chaque set, avec le moteur du site, dans Chromium sans écran. Il faut le site construit dans out/
 * (`NEXT_PUBLIC_BASE_PATH=/klods npm run build`) : on ouvre sa page /essai/couverture/.
 *
 * Les images déjà dessinées pour le même fichier de modèle sont reprises du cache data/raw/covers/
 * (gardé entre deux passages du workflow) : seuls les sets nouveaux ou modifiés sont redessinés.
 * Écrit public/data/covers/ et data/build/covers-report.json. Un set qui échoue garde la couverture
 * dessinée par défaut sur le site ; le script n'échoue pas pour autant.
 */
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import fsp from "node:fs/promises";
import path from "node:path";
import { chromium, type Browser, type Page } from "@playwright/test";
import { SetsIndex, defaultModel, playableModels } from "../../src/lib/catalog.ts";
import { BUILD, PUBLIC_DATA, RAW, ROOT, SETS_INDEX } from "./lib/paths.ts";

/** À changer quand le dessin change : toutes les couvertures sont alors redessinées. */
const COVER_VERSION = "1";
const PORT = Number(process.env.COVERS_PORT ?? 4174);
const PAGES = Math.max(1, Number(process.env.COVERS_PAGES ?? 2));
const TIMEOUT_MS = Number(process.env.COVERS_TIMEOUT_MS ?? 120_000);
/** Une page qui a dessiné beaucoup de sets est rechargée, pour repartir avec une mémoire propre. */
const RELOAD_EVERY = 40;
const ONLY = (process.env.DATA_ONLY ?? "").split(",").map((s) => s.trim()).filter(Boolean);

const CACHE = path.join(RAW, "covers");
const OUT = path.join(PUBLIC_DATA, "covers");
const REPORT = path.join(BUILD, "covers-report.json");

type Job = { number: string; hash: string; req: Record<string, unknown> };
type Result = { number: string; status: "dessinee" | "cache" | "echec"; ms?: number; loadMs?: number; error?: string };

const cached = (job: Job, kind: "webp" | "jpg") => path.join(CACHE, `${job.number}-${job.hash}.${kind}`);
const exists = (f: string) =>
  fsp.stat(f).then(
    () => true,
    () => false,
  );
const fromDataUrl = (url: string) => Buffer.from(url.slice(url.indexOf(",") + 1), "base64");

async function jobs(): Promise<Job[]> {
  const index = SetsIndex.parse(JSON.parse(await fsp.readFile(SETS_INDEX, "utf8")));
  const list: Job[] = [];
  for (const set of index.sets) {
    if (ONLY.length && !ONLY.includes(set.number)) continue;
    if (!playableModels(set).length) continue;
    const m = defaultModel(set);
    const file = await fsp.readFile(path.join(ROOT, "public", m.file));
    const hash = createHash("sha1").update(COVER_VERSION).update(file).digest("hex").slice(0, 12);
    list.push({
      number: set.number,
      hash,
      req: { file: m.file, bytes: m.bytes, number: set.number, name: set.name, theme: set.theme, year: set.year, parts: m.parts, steps: m.steps },
    });
  }
  return list;
}

/** Sert out/ sous /klods (même serveur que les tests de bout en bout). */
async function serve(): Promise<() => void> {
  const child = spawn(process.execPath, [path.join(ROOT, "scripts", "serve-out.mjs"), String(PORT)], { stdio: ["ignore", "pipe", "inherit"] });
  await new Promise<void>((resolve, reject) => {
    child.stdout.on("data", () => resolve());
    child.on("exit", (code) => reject(new Error(`serveur arrêté (${code})`)));
  });
  return () => child.kill();
}

async function openPage(browser: Browser): Promise<Page> {
  const page = await browser.newPage({ viewport: { width: 1000, height: 760 }, deviceScaleFactor: 1 });
  page.on("pageerror", (e) => console.warn(`  erreur de page : ${e.message}`));
  await page.goto(`http://localhost:${PORT}/klods/essai/couverture/`);
  await page.waitForFunction(() => document.body.dataset.klodsReady === "1", null, { timeout: 60_000 });
  return page;
}

async function draw(page: Page, job: Job) {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => (timer = setTimeout(() => reject(new Error(`plus de ${TIMEOUT_MS / 1000} s`)), TIMEOUT_MS)));
  try {
    return await Promise.race([page.evaluate((req) => window.klodsDraw!(req as never), job.req), timeout]);
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  if (!(await exists(path.join(ROOT, "out", "essai", "couverture", "index.html")))) {
    console.error("Le site n'est pas construit : lance d'abord `NEXT_PUBLIC_BASE_PATH=/klods npm run build`.");
    process.exit(1);
  }
  const all = await jobs();
  await fsp.mkdir(CACHE, { recursive: true });
  await fsp.mkdir(BUILD, { recursive: true });
  if (!ONLY.length) await fsp.rm(OUT, { recursive: true, force: true });
  await fsp.mkdir(OUT, { recursive: true });

  const results: Result[] = [];
  const todo: Job[] = [];
  for (const job of all) {
    if ((await exists(cached(job, "webp"))) && (await exists(cached(job, "jpg")))) results.push({ number: job.number, status: "cache" });
    else todo.push(job);
  }
  console.log(`${all.length} sets : ${results.length} couvertures en cache, ${todo.length} à dessiner`);

  if (todo.length) {
    const stop = await serve();
    const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
    let next = 0;
    let done = 0;
    const t0 = Date.now();
    await Promise.all(
      Array.from({ length: Math.min(PAGES, todo.length) }, async () => {
        let page = await openPage(browser);
        let drawn = 0;
        while (next < todo.length) {
          const job = todo[next++];
          try {
            if (drawn >= RELOAD_EVERY) {
              await page.close();
              page = await openPage(browser);
              drawn = 0;
            }
            const r = await draw(page, job);
            drawn++;
            await fsp.writeFile(cached(job, "webp"), fromDataUrl(r.cover));
            await fsp.writeFile(cached(job, "jpg"), fromDataUrl(r.card));
            results.push({ number: job.number, status: "dessinee", ms: r.ms, loadMs: r.loadMs });
          } catch (err) {
            const message = String((err as Error).message ?? err);
            if (process.env.COVERS_DEBUG) console.log(`--- ${job.number}\n${message}\n${(err as Error).stack ?? ""}`);
            results.push({ number: job.number, status: "echec", error: message.split("\n")[0].slice(0, 300) });
            // la page peut être bloquée sur un gros modèle : on repart d'une page neuve
            await page.close().catch(() => {});
            page = await openPage(browser);
            drawn = 0;
          }
          if (++done % 50 === 0) console.log(`  ${done}/${todo.length} dessinées (${Math.round((Date.now() - t0) / 1000)} s)`);
        }
        await page.close();
      }),
    );
    await browser.close();
    stop();
  }

  // copie vers le site : uniquement les images des sets réussis, sous le nom attendu par les pages
  const ok = new Set(results.filter((r) => r.status !== "echec").map((r) => r.number));
  for (const job of all) {
    if (!ok.has(job.number)) continue;
    await fsp.copyFile(cached(job, "webp"), path.join(OUT, `${job.number}.webp`));
    await fsp.copyFile(cached(job, "jpg"), path.join(OUT, `${job.number}-partage.jpg`));
  }

  const failed = results.filter((r) => r.status === "echec");
  const times = results.flatMap((r) => (r.ms ? [r.ms] : [])).sort((a, b) => a - b);
  const median = times.length ? times[Math.floor(times.length / 2)] : 0;
  await fsp.writeFile(REPORT, JSON.stringify({ generatedAt: new Date().toISOString(), version: COVER_VERSION, results }, null, 1));
  console.log(
    `Couvertures : ${ok.size}/${all.length} (${results.filter((r) => r.status === "dessinee").length} dessinées, ` +
      `${results.filter((r) => r.status === "cache").length} en cache, ${failed.length} échecs), médiane ${median} ms`,
  );
  for (const f of failed.slice(0, 20)) console.log(`  échec ${f.number} : ${f.error}`);
  const slow = results.filter((r) => r.ms).sort((a, b) => b.ms! - a.ms!).slice(0, 5);
  await fsp.writeFile(
    path.join(BUILD, "covers-summary.md"),
    [
      "## Couvertures",
      `- ${ok.size}/${all.length} sets ont leur couverture (${results.filter((r) => r.status === "dessinee").length} dessinées, ${results.filter((r) => r.status === "cache").length} reprises du cache)`,
      `- Temps médian par set : ${median} ms`,
      ...slow.map((r) => `- Lent : ${r.number} (${Math.round(r.ms! / 1000)} s)`),
      ...failed.map((f) => `- Échec : ${f.number} (${f.error})`),
      "",
    ].join("\n"),
  );
}

await main();
