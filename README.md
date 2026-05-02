# ide

A barebones in-browser C IDE that exists to exercise [`@jtrb/runtime`](https://www.npmjs.com/package/@jtrb/runtime) end-to-end on a real deployment. Textarea, run button, output pane. Nothing fancy.

## Local dev

```bash
npm install
npm run dev
```

Open http://localhost:3000.

The dev server sets `Cross-Origin-Embedder-Policy: require-corp` and `Cross-Origin-Opener-Policy: same-origin` (see [next.config.ts](./next.config.ts)) so `SharedArrayBuffer` works.

## Feedback loop

The IDE consumes the published `@jtrb/runtime` from npm.

1. In `dev/runtime`, after a change: `npm run release` (bumps patch + publishes).
2. Here: `npm run bump` (installs latest, commits, pushes — Vercel auto-deploys).

For a tighter local-only loop, `npm link ../runtime` in this repo (don't commit the resulting `package.json` change).

## Deploy

Auto-deploys to https://ide.fabioibanez.com via Vercel on push to `main`.
