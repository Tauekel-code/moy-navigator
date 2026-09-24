// Раздел 24-25 ТЗ: PWA + базовая устойчивость к временной потере сети.
// Стратегия: network-first с откатом на кэш для навигаций и GET-запросов
// к API (можно посмотреть уже загруженный день офлайн). Мутации (POST/
// PATCH/DELETE) в кэш не идут — офлайн-очередь изменений не входит в v1
// (см. README, "Известные ограничения").

const CACHE_NAME = "navigator-shell-v1";
const PRECACHE_URLS = ["/today", "/manifest.webmanifest", "/icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return; // мутации не кэшируем

  const url = new URL(request.url);
  const isNavigation = request.mode === "navigate";
  const isApiGet = url.pathname.startsWith("/api/");

  if (!isNavigation && !isApiGet) return; // статику отдаём браузеру как обычно

  event.respondWith(
    fetch(request)
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        return response;
      })
      .catch(() => caches.match(request).then((cached) => cached || caches.match("/today"))),
  );
});
