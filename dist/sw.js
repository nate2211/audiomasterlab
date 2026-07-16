/* AudioMaster Lab legacy worker cleanup only. This worker never caches files. */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => {
    event.waitUntil((async () => {
        const names = await caches.keys();
        await Promise.all(names.map((name) => caches.delete(name)));
        await self.registration.unregister();
        const clients = await self.clients.matchAll({ type: "window" });
        clients.forEach((client) => client.navigate(client.url));
    })());
});
self.addEventListener("fetch", () => {
    // Deliberately no respondWith(): every request goes directly to the network.
});
