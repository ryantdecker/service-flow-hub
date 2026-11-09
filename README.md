# Service Flow Hub

Nuxt + JSON Phase 0 scaffold for live venue companions (guest) and client admin.

Demo org: **River Valley Church** — campuses and service times stubbed from [rivervalley.org](https://www.rivervalley.org/).

## Run

```bash
npm install
npm run dev
```

| Surface | URL |
| --- | --- |
| Home | http://localhost:3001/ (or 3000 if free) |
| Admin | http://localhost:3001/admin |
| RV venues | http://localhost:3001/admin/o/river-valley |
| City guest live | http://localhost:3001/v/river-valley/city |
| City producer | http://localhost:3001/admin/o/river-valley/v/city/live |
| Item library | http://localhost:3001/admin/o/river-valley/items |
| Flow builder | http://localhost:3001/admin/o/river-valley/v/city/e/sun-0900/flow |

River Valley seed includes **15 venues** with service times from rivervalley.org, an **item library**, and City Campus demo event (`sun-0900`).

**Builder split:** Item library = create/edit reusable content. Flow builder = group items into segments + set timing.

Phone on same Wi‑Fi: `npm run dev -- --host`, then open the Network URL.

## Data

JSON blobs in [`data/`](data/) — see [`data/README.md`](data/README.md). Vite React prototype archived under [`_legacy/vite-demo`](_legacy/vite-demo).
