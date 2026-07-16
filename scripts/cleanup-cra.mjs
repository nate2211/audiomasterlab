import { rm } from "node:fs/promises";

// CRA used public/index.html as its template. Vite uses the root index.html,
// and leaving both in the project makes Vite scan two competing app entries.
const obsoleteFiles = [
    "public/index.html",
    "scripts/verify-prerender.js",
    "src/pwa/registerAudioServiceWorker.js",
];

await Promise.all(
    obsoleteFiles.map((file) => rm(file, { force: true }).catch(() => undefined))
);

console.log("Removed obsolete CRA/react-snap entry and registration files.");
