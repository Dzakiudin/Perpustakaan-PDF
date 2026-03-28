const CACHE_NAME = "bookin-v1";
const OFFLINE_URL = "/offline.html";

// Pre-cache static assets
const PRECACHE_URLS = [
    "/",
    "/offline.html",
    "/manifest.json",
];

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
    );
    self.skipWaiting();
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
        )
    );
    self.clients.claim();
});

self.addEventListener("fetch", (event) => {
    if (event.request.mode === "navigate") {
        event.respondWith(
            fetch(event.request).catch(() => caches.match(OFFLINE_URL))
        );
        return;
    }

    // Network-first for static assets to avoid hydration mismatches during development
    if (event.request.url.match(/\.(css|js|png|jpg|jpeg|svg|woff2?)$/)) {
        event.respondWith(
            fetch(event.request).then((response) => {
                const clone = response.clone();
                caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
                return response;
            }).catch(() => caches.match(event.request))
        );
        return;
    }

    // Network-first for everything else
    event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
});
