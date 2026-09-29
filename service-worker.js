const CACHE_NAME = "cachecourse-shell-v1";
const PACK_CACHE = "cachecourse-lessons-v1";
const SHELL = ["/", "/index.html", "/styles.css", "/manifest.webmanifest", "/assets/icon.svg", "/src/app.js", "/src/lessons.js", "/src/logic.js", "/src/storage.js"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith("cachecourse-") && key !== CACHE_NAME && key !== PACK_CACHE).map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener("message", (event) => {
  if (!event.data || event.data.type !== "DOWNLOAD_LESSON_PACK") return;
  event.waitUntil(caches.open(PACK_CACHE).then((cache) => cache.put("/lesson-pack.json", new Response(JSON.stringify(event.data.lessons), { headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } }))).then(() => {
    if (event.ports && event.ports[0]) event.ports[0].postMessage({ ok: true });
  }).catch((error) => {
    if (event.ports && event.ports[0]) event.ports[0].postMessage({ ok: false, message: error.message });
  }));
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) return;
  event.respondWith(caches.match(request).then((cached) => {
    if (cached) return cached;
    return fetch(request).catch(() => {
      if (request.mode === "navigate") return caches.match("/index.html");
      return new Response("Offline: this item is not in your downloaded lesson pack.", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } });
    });
  }));
});
