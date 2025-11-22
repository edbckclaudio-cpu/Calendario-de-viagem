const CACHE_NAME = "trae-cache-v1";
const PRECACHE_URLS = ["/", "/manifest.json", "/icons/icon-192.svg", "/icons/icon-512.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

function cacheFirst(req) {
  return caches.match(req).then((cached) => cached || fetch(req).then((res) => {
    const clone = res.clone();
    caches.open(CACHE_NAME).then((c) => c.put(req, clone));
    return res;
  }));
}

function networkFirst(req) {
  return fetch(req).then((res) => {
    const clone = res.clone();
    caches.open(CACHE_NAME).then((c) => c.put(req, clone));
    return res;
  }).catch(() => caches.match(req));
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const dest = req.destination;
  if (event.request.mode === "navigate") {
    event.respondWith(networkFirst(req).catch(() => caches.match("/")));
    return;
  }
  if (["style", "script", "image", "font"].includes(dest)) {
    event.respondWith(cacheFirst(req));
    return;
  }
  event.respondWith(networkFirst(req));
});