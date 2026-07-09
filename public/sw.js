/* public/sw.js
   Minimal AudioMaster Lab service worker.
   It caches only safe app-shell files and intentionally avoids audio/video,
   API, range, archive-proxy, and streaming requests so playback and scrubbing
   keep working normally.
*/

const CACHE_NAME = "audiomasterlab-app-shell-v1";
const APP_SHELL_URLS = [
    "/",
    "/index.html",
    "/manifest.json",
];

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches
            .open(CACHE_NAME)
            .then((cache) => cache.addAll(APP_SHELL_URLS))
            .catch(() => undefined)
            .then(() => self.skipWaiting())
    );
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches
            .keys()
            .then((keys) =>
                Promise.all(
                    keys
                        .filter((key) => key !== CACHE_NAME)
                        .map((key) => caches.delete(key))
                )
            )
            .then(() => self.clients.claim())
    );
});

function shouldBypassCache(request) {
    const url = new URL(request.url);

    if (request.method !== "GET") return true;
    if (request.headers.has("range")) return true;

    const destination = request.destination || "";
    if (["audio", "video", "track"].includes(destination)) return true;

    if (url.pathname.startsWith("/api/")) return true;
    if (url.hostname.includes("archive.org")) return true;
    if (url.hostname === "scrapewebsite.pages.dev") return true;
    if (/\.(mp3|wav|ogg|oga|opus|m4a|mp4|webm|flac|aac|m3u8|mpd)$/i.test(url.pathname)) {
        return true;
    }

    return false;
}

self.addEventListener("fetch", (event) => {
    const { request } = event;

    if (shouldBypassCache(request)) {
        return;
    }

    event.respondWith(
        caches.match(request).then((cached) => {
            if (cached) return cached;

            return fetch(request)
                .then((response) => {
                    const copy = response.clone();

                    if (response.ok && request.destination !== "") {
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(request, copy).catch(() => undefined);
                        });
                    }

                    return response;
                })
                .catch(() => caches.match("/index.html"));
        })
    );
});

self.addEventListener("message", (event) => {
    if (event.data && event.data.type === "SKIP_WAITING") {
        self.skipWaiting();
    }
});
