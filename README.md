# debugger.sh

An in-browser C IDE for [`debugger-sh`](https://www.npmjs.com/package/debugger-sh). Editor, breakpoints, step debugging, interactive terminal, call stack, and variable inspector — all client-side.

Lives at https://debugger.sh

## Run locally

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

The Next dev server sets COOP/COEP headers (see [next.config.ts](./next.config.ts)) so `SharedArrayBuffer` works for the wasm runtime.

## Layout

```
app/page.tsx              wires components + useExecution
hooks/useExecution.ts     runtime + DAP lifecycle
components/
  CodeEditor.tsx          CodeMirror + breakpoint gutter + stopped-line highlight
  Terminal.tsx            xterm.js (stdin + stdout)
  VariablesPanel.tsx      call stack + variables
  SourceActions.tsx       run / stop / step toolbar
  ResizableWorkspace.tsx  draggable VS Code-style dock
```

## Bumping the runtime

```bash
npm i debugger-sh@latest
```

## Deploy

Static Next export (`output: 'export'`) served by a Cloudflare Worker. Pushing to `main` runs `npm run build` then `npx wrangler deploy` (~30s). [`public/_headers`](./public/_headers) carries COOP/COEP in production since the Next `headers()` config is dropped during static export.
