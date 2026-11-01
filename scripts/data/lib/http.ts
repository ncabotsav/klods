import fs from "node:fs/promises";
import path from "node:path";

/**
 * Téléchargements polis : une requête à la fois, au moins une seconde entre deux requêtes vers le
 * même site, un User-Agent qui dit qui on est, et un cache disque pour ne jamais redemander un fichier.
 */
const USER_AGENT = "Klods data pipeline (+https://github.com/ncabotsav/klods)";
const MIN_INTERVAL_MS = Number(process.env.DATA_MIN_INTERVAL_MS ?? 1000);
const lastCall = new Map<string, number>();

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function waitTurn(url: string) {
  const host = new URL(url).host;
  const wait = (lastCall.get(host) ?? 0) + MIN_INTERVAL_MS - Date.now();
  if (wait > 0) await sleep(wait);
  lastCall.set(host, Date.now());
}

export type FetchResult = { status: number; body: Buffer | null; fromCache: boolean };

export async function exists(file: string) {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

/**
 * Récupère `url` dans `cacheFile`. Si le fichier est déjà là, rien ne part sur le réseau.
 * Un 404 renvoie `{status: 404, body: null}` sans rien écrire ; les autres erreurs sont réessayées 3 fois.
 */
export async function fetchCached(url: string, cacheFile: string, { force = false } = {}): Promise<FetchResult> {
  if (!force && (await exists(cacheFile))) {
    return { status: 200, body: await fs.readFile(cacheFile), fromCache: true };
  }
  let lastError: unknown;
  for (let attempt = 1; attempt <= 3; attempt++) {
    await waitTurn(url);
    try {
      const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
      if (res.status === 404) return { status: 404, body: null, fromCache: false };
      if (res.status === 429 || res.status >= 500) {
        lastError = new Error(`HTTP ${res.status} sur ${url}`);
        await sleep(5000 * attempt);
        continue;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status} sur ${url}`);
      const body = Buffer.from(await res.arrayBuffer());
      await fs.mkdir(path.dirname(cacheFile), { recursive: true });
      await fs.writeFile(cacheFile, body);
      return { status: res.status, body, fromCache: false };
    } catch (err) {
      lastError = err;
      await sleep(2000 * attempt);
    }
  }
  throw lastError;
}
