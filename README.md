# Service Flow Hub

Guest-facing RFID/NFC service hub for a live church service. After a tap, guests land on one curated phone page with the full service order—current segment highlighted, past quieter, upcoming still reachable.

Fictional demo church: **Riverside Community Church · Sunday 9:00**.

## Run locally

```bash
cd ~/cursor-ai/service-flow-hub
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`).

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Vite dev server with HMR |
| `npm run build` | Typecheck + production build to `dist/` |
| `npm run preview` | Serve the production build locally |

## What’s on the page

Segments: Welcome → Worship → Announcements → Giving → Sermon notes → Post service.

Default **Now** is **Announcements** (mid-service) so the highlight is obvious. A small footer **Demo** toggle (off by default) lets reviewers scrub prev/next through segments.
