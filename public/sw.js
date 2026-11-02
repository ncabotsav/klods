/*
 * Service worker de Klods : le site marche sans réseau pour ce qu'on a déjà ouvert.
 *
 * - Fichiers du site (_next/static, polices, icônes) : en cache d'abord, ils ne changent jamais de nom.
 * - Modèles 3D (data/models) : en cache d'abord ; ouvrir un set garde aussi sa fiche et sa page de montage.
 * - Couvertures : servies du cache, rafraîchies en arrière-plan.
 * - Pages et index : réseau d'abord, cache en secours ; sinon la page « Hors connexion ».
 * Les noms de cache servent aussi à la page /hors-connexion/ (liste des sets disponibles).
 */
const VERSION = "1";
const STATIC = `klods-statique-${VERSION}`;
const PAGES = "klods-pages";
const MODELS = "klods-modeles";
const COVERS = "klods-couvertures";
const LIMITS = { [STATIC]: 600, [PAGES]: 300, [MODELS]: 40, [COVERS]: 600 };

const BASE = new URL(self.registration.scope).pathname; // « /klods/ » sur GitHub Pages, « / » ailleurs
const OFFLINE = `${BASE}hors-connexion/`;
const PRECACHE = [BASE, OFFLINE, `${BASE}recherche.json`, `${BASE}manifest.webmanifest`, `${BASE}icons/icone-192.png`];

/** Garde la page « Hors connexion » avec ses scripts et ses styles : elle doit marcher sans avoir été visitée. */
async function precache() {
  const pages = await caches.open(PAGES);
  await pages.addAll(PRECACHE);
  const html = await (await pages.match(OFFLINE)).text();
  const assets = [...html.matchAll(/(?:src|href)="([^"]*\/_next\/static\/[^"]+)"/g)].map((m) => m[1].replace(/&amp;/g, "&"));
  const statics = await caches.open(STATIC);
  await statics.addAll([...new Set(assets)]);
}

self.addEventListener("install", (event) => {
  event.waitUntil(precache().then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("klods-statique-") && k !== STATIC).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

/** Garde un cache sous sa limite en retirant les entrées les plus anciennes. */
async function trim(name) {
  const cache = await caches.open(name);
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - LIMITS[name]; i++) await cache.delete(keys[i]);
}

/** Clé de cache d'une page : sans paramètres (« ?etape=12 » rejoue la même page). */
const pageKey = (url) => `${url.origin}${url.pathname}`;

async function put(name, key, response) {
  if (!response || !response.ok || response.type === "opaque") return;
  const cache = await caches.open(name);
  await cache.put(key, response);
  await trim(name);
}

async function cacheFirst(request, name) {
  const hit = await caches.match(request, { cacheName: name });
  if (hit) return hit;
  const response = await fetch(request);
  await put(name, request, response.clone());
  return response;
}

async function staleWhileRevalidate(request, name) {
  const hit = await caches.match(request, { cacheName: name });
  const network = fetch(request)
    .then(async (response) => {
      await put(name, request, response.clone());
      return response;
    })
    .catch(() => hit);
  return hit || network;
}

async function networkFirst(request, url, navigate) {
  try {
    const response = await fetch(request);
    await put(PAGES, pageKey(url), response.clone());
    return response;
  } catch (err) {
    const hit = await caches.match(pageKey(url), { cacheName: PAGES, ignoreSearch: true });
    if (hit) return hit;
    // une page jamais vue : on va sur « Hors connexion » (une vraie redirection, pour que l'adresse
    // corresponde à la page et que le site se charge normalement)
    if (navigate && url.pathname !== OFFLINE && (await caches.match(OFFLINE, { cacheName: PAGES }))) return Response.redirect(OFFLINE, 302);
    throw err;
  }
}

/** Ouvrir un set garde aussi sa fiche et sa page de montage, pour les rouvrir sans réseau. */
async function keepSetPages(set) {
  const cache = await caches.open(PAGES);
  await Promise.all(
    [`${BASE}set/${set}/`, `${BASE}set/${set}/monter/`].map(async (path) => {
      const key = new URL(path, self.location.origin).href;
      if (await cache.match(key)) return;
      try {
        const response = await fetch(path);
        if (response.ok) await cache.put(key, response);
      } catch {
        // pas de réseau : la page sera gardée à la prochaine visite
      }
    }),
  );
  await trim(PAGES);
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || !url.pathname.startsWith(BASE)) return;
  const path = url.pathname.slice(BASE.length);

  if (path.startsWith("_next/static/") || path.startsWith("icons/")) {
    event.respondWith(cacheFirst(request, STATIC));
  } else if (path.startsWith("data/models/")) {
    const set = path.split("/")[2];
    event.respondWith(cacheFirst(request, MODELS));
    if (set) event.waitUntil(keepSetPages(set));
  } else if (path.startsWith("data/covers/")) {
    event.respondWith(staleWhileRevalidate(request, COVERS));
  } else {
    event.respondWith(networkFirst(request, url, request.mode === "navigate"));
  }
});
