# AudioMaster Lab Vite edition

This package preserves the original AudioMaster Lab pages while replacing CRA,
react-snap, and service-worker registration with Vite and deterministic static
SEO documents.

## Run

```bash
npm install
npm run dev
npm run build
npm run preview
```

The production site output is `dist/`. The build generates route-specific HTML
for crawlers without launching Chromium or relying on react-snap.

Vite environment variables use `VITE_` names:

- `VITE_SCRAPE_API_ROOT`
- `VITE_YOUTUBE_API_KEY`

The new `PlayerProvider` owns one persistent HTML audio element, Media Session
metadata/action handlers, playback progress, and the responsive mini-player.
Archive tracks now start in this player without reloading the route.
