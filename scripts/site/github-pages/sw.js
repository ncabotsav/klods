/*
 * Ancien service worker de ncabotsav.github.io/klods : il efface ses caches, se désinscrit et recharge
 * les pages ouvertes, qui partent alors vers klods.app.
 */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) await caches.delete(key);
      await self.registration.unregister();
      for (const client of await self.clients.matchAll({ type: "window" })) client.navigate(client.url);
    })(),
  );
});
