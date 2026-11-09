# JSON data store (Phase 0)

Lite persistence for the Nuxt scaffold. Files are the source of truth until Postgres lands.

| Path | Contents |
| --- | --- |
| `organizations/{slug}.json` | Org meta + branding |
| `venues/{org}__{venue}.json` | Campus / venue + service times |
| `items/{org}.json` | Reusable item library (links, songs, videos, CTAs) |
| `events/{org}__{venue}__{event}.json` | Event flow (segments → itemIds) + schedule + liveState |

River Valley campuses and times sourced from [rivervalley.org](https://www.rivervalley.org/) (visit / locations pages).
