/* public/sw.js
   AudioMaster Lab service worker.

   - Uses network-first for page navigation.
   - Avoids caching audio, video, API, proxy, archive, and range requests.
   - Uses cache-first only for safe versioned static assets.
*/

const CACHE_NAME = "audiomasterlab-app-shell-v2";
const OFFLINE_PAGE = "/index.html";

const INSTALL_URLS = [
    "/manifest.json",
];

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches
            .open(CACHE_NAME)
            .then((cache) => cache.addAll(INSTALL_URLS))
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

    if (request.method !== "GET") {
        return true;
    }

    if (request.headers.has("range")) {
        return true;
    }

    const destination = request.destination || "";

    if (["audio", "video", "track"].includes(destination)) {
        return true;
    }

    if (url.pathname.startsWith("/api/")) {
        return true;
    }

    if (url.hostname.includes("archive.org")) {
        return true;
    }

    if (url.hostname === "scrapewebsite.pages.dev") {
        return true;
    }

    if (
        /\.(mp3|wav|ogg|oga|opus|m4a|mp4|webm|flac|aac|m3u8|mpd)$/i.test(
            url.pathname
        )
    ) {
        return true;
    }

    return false;
}

function isNavigationRequest(request) {
    return (
        request.mode === "navigate" ||
        request.destination === "document" ||
        request.headers.get("accept")?.includes("text/html")
    );
}

function isSafeStaticAsset(request, url) {
    if (url.origin !== self.location.origin) {
        return false;
    }

    const destination = request.destination || "";

    return [
        "script",
        "style",
        "font",
        "image",
    ].includes(destination);
}

async function handleNavigationRequest(request) {
    const cache = await caches.open(CACHE_NAME);

    try {
        /*
         * cache: "no-store" prevents the browser HTTP cache from supplying
         * an old index.html while still allowing us to maintain our own
         * offline copy.
         */
        const response = await fetch(request, {
            cache: "no-store",
        });

        if (response && response.ok) {
            await cache.put(OFFLINE_PAGE, response.clone());
        }

        return response;
    } catch {
        const cachedPage = await cache.match(OFFLINE_PAGE);

        if (cachedPage) {
            return cachedPage;
        }

        return new Response(
            "AudioMaster Lab is currently unavailable while offline.",
            {
                status: 503,
                headers: {
                    "Content-Type": "text/plain; charset=utf-8",
                },
            }
        );
    }
}

async function handleStaticAssetRequest(request) {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);

    if (cached) {
        return cached;
    }

    const response = await fetch(request);

    if (response && response.ok) {
        await cache.put(request, response.clone());
    }

    return response;
}

self.addEventListener("fetch", (event) => {
    const { request } = event;
    const url = new URL(request.url);

    if (shouldBypassCache(request)) {
        return;
    }

    if (isNavigationRequest(request)) {
        event.respondWith(handleNavigationRequest(request));
        return;
    }

    if (isSafeStaticAsset(request, url)) {
        event.respondWith(handleStaticAssetRequest(request));
    }
});

self.addEventListener("message", (event) => {
    if (event.data?.type === "SKIP_WAITING") {
        self.skipWaiting();
    }

    if (event.data?.type === "CLEAR_CACHES") {
        event.waitUntil(
            caches
                .keys()
                .then((keys) =>
                    Promise.all(keys.map((key) => caches.delete(key)))
                )
        );
    }
});