// Tiny Worker that strips the `/ide` prefix from incoming request paths
// before looking them up in the static-asset bundle.
//
// Why this exists:
// The Cloudflare Workers Route `fabioibanez.com/ide*` forwards every request
// under `/ide` to this Worker. But our static export lives at the asset root
// (`out/index.html`, `out/_next/...`), so a raw lookup for `/ide` or
// `/ide/_next/foo.js` would 404. Stripping the prefix here maps the request
// path back onto the actual file layout. The HTML references inside
// `index.html` are still emitted with the `/ide` prefix (via `basePath` in
// next.config.ts), so subsequent asset requests round-trip correctly through
// this same Worker.
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/ide' || url.pathname === '/ide/') {
      url.pathname = '/';
    } else if (url.pathname.startsWith('/ide/')) {
      url.pathname = url.pathname.slice(4); // drop "/ide"
    }
    return env.ASSETS.fetch(new Request(url.toString(), request));
  },
};
