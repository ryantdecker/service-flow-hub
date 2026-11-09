# JSON data store (Phase 0)

Lite persistence for the Nuxt scaffold. Files are the source of truth until Postgres lands.

**Local/dev** reads these files directly from disk (admin edits persist).

**Vercel / serverless:** the lambda FS is read-only and Nitro `serverAssets` do not reliably ship, so `npm run prebuild` runs `scripts/generate-seed-data.mjs` to inline seeds into `server/utils/seed-data.generated.ts`. Runtime falls back to that bundle (+ an in-memory write overlay). After editing JSON under `data/`, run `npm run generate:seeds` (or `npm run build`) before deploying.

| Path | Contents |
| --- | --- |
| `organizations/{slug}.json` | Org meta + branding |
| `venues/{org}__{venue}.json` | Campus / venue + service times |
| `items/{org}.json` | Reusable item library (links, songs, videos, CTAs) |
| `events/{org}__{venue}__{event}.json` | Event flow (segments → itemIds) + schedule + liveState |

River Valley campuses and times sourced from [rivervalley.org](https://www.rivervalley.org/) (visit / locations pages).
