# ide

A barebones in-browser C IDE for exercising [`@jtrb/runtime`](https://www.npmjs.com/package/@jtrb/runtime) on a real deployment. Textarea + run button + breakpoints + variables panel. Nothing fancy.

Lives at https://fabioibanez.com/ide via a Cloudflare Workers Route that points `fabioibanez.com/ide*` at this Worker.

## Local dev

```bash
npm install
npm run dev
```

Open http://localhost:3000. The Next dev server sets `Cross-Origin-Embedder-Policy: require-corp` and `Cross-Origin-Opener-Policy: same-origin` (see [next.config.ts](./next.config.ts)) so `SharedArrayBuffer` works.

## Production deploy

This is a Next.js static export (`output: 'export'`) deployed as a Cloudflare Worker with Static Assets:

- [wrangler.jsonc](./wrangler.jsonc) — points wrangler at `out/`
- [public/_headers](./public/_headers) — COOP/COEP for production (the Next `headers()` config is ignored in static export builds, which is why we duplicate them here)

Pushing to `main` triggers the Worker Build, which runs `npm run build` then `npx wrangler deploy`. Takes ~30 seconds.

## Feedback loop

Consumes the published `@jtrb/runtime` from npm.

```bash
# in dev/runtime, after a change
npm run release           # version patch + npm publish

# here
npm run bump              # npm i @jtrb/runtime@latest + commit + push
```

The push triggers the Cloudflare deploy automatically.

For a sub-second local-only loop without publishing: `npm link ../runtime` in this repo. Don't commit any resulting `package.json` change.
