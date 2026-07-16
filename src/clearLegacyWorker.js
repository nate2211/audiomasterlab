const CLEANUP_KEY = "audiomasterlab.vite-worker-cleanup.v1";

/**
 * Removes registrations and Cache Storage left by the former CRA/Workbox app.
 * This runs once per browser profile and never registers a replacement worker.
 */
export async function clearLegacyWorker() {
    if (typeof window === "undefined" || sessionStorage.getItem(CLEANUP_KEY)) return;
    sessionStorage.setItem(CLEANUP_KEY, "1");

    try {
        if ("serviceWorker" in navigator) {
            const registrations = await navigator.serviceWorker.getRegistrations();
            await Promise.all(registrations.map((registration) => registration.unregister()));
        }
    } catch {
        // Playback and routing must still start when browser privacy settings block access.
    }

    try {
        if ("caches" in window) {
            const names = await caches.keys();
            await Promise.all(names.map((name) => caches.delete(name)));
        }
    } catch {
        // Cache Storage may be disabled in private browsing.
    }
}
