const CACHE_NAME = "crew-roster-shell-v6";
const APP_FILES = ["./", "./index.html", "./manifest.json"];

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await Promise.all(APP_FILES.map(async file => {
      const url = new URL(file, self.registration.scope).href;
      try {
        const response = await fetch(url, { cache: "reload" });
        if (response && response.ok) await cache.put(url, response);
      } catch (error) {
        // 오프라인 상태에서는 캐시 가능한 파일만 사용합니다.
      }
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter(key => key.startsWith("crew-roster-shell-") && key !== CACHE_NAME)
        .map(key => caches.delete(key))
    );
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  const isNavigation = request.mode === "navigate";
  const isAppCode =
    isNavigation ||
    url.pathname.endsWith(".html") ||
    url.pathname.endsWith(".js") ||
    url.pathname.endsWith(".css") ||
    url.pathname.endsWith(".json");

  if (isAppCode) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      try {
        const response = await fetch(request, { cache: "no-store" });
        if (response && response.ok) {
          await cache.put(request, response.clone());
        }
        return response;
      } catch (error) {
        const cached = await cache.match(request);
        if (cached) return cached;

        if (isNavigation) {
          const base = self.registration.scope;
          const fallback = await cache.match(new URL("index.html", base).href) ||
                           await cache.match(new URL("./", base).href);
          if (fallback) return fallback;
        }
        throw error;
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);
    if (cached) return cached;

    const response = await fetch(request);
    if (response && response.ok) await cache.put(request, response.clone());
    return response;
  })());
});
