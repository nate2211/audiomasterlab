const fs = require("fs");
const path = require("path");

const routes = [
    "/",
    "/audio",
    "/editor",
    "/recorder",
    "/youtube",
    "/news",
    "/transcribe",
    "/visualizer",
    "/archive",
    "/community",
    "/help",
    "/about",
    "/contact",
    "/privacy",
    "/terms",
    "/copyright",
];

function fileForRoute(route) {
    if (route === "/") {
        return path.join("build", "index.html");
    }

    return path.join(
        "build",
        route.replace(/^\/+|\/+$/g, ""),
        "index.html"
    );
}

const errors = [];

for (const route of routes) {
    const filename = fileForRoute(route);

    if (!fs.existsSync(filename)) {
        errors.push(`${route}: missing ${filename}`);
        continue;
    }

    const html = fs.readFileSync(filename, "utf8");

    if (!html.includes('id="root"')) {
        errors.push(`${route}: #root is missing`);
        continue;
    }

    const emptyRootPattern =
        /<div\s+id=["']root["']\s*>\s*<\/div>/i;

    if (emptyRootPattern.test(html)) {
        errors.push(`${route}: #root is still empty`);
    }
}

if (errors.length > 0) {
    console.error("\nPrerender verification failed:\n");
    for (const error of errors) {
        console.error(`- ${error}`);
    }
    process.exit(1);
}

console.log(
    `Verified ${routes.length} prerendered AudioMaster Lab routes.`
);