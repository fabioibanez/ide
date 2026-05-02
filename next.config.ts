import type { NextConfig } from 'next';

// COOP/COEP are required by @jtrb/runtime to use SharedArrayBuffer for stdin.
//
// Production (Cloudflare Workers Static Assets): set via `public/_headers`,
// which is copied into `out/_headers` and read by the Workers asset server.
//
// Local dev (`next dev`): `_headers` is a Cloudflare convention and is NOT
// honored by the Next dev server, so we also keep the `headers()` config
// below. It's a no-op for `next build` with `output: 'export'`.
const nextConfig: NextConfig = {
  output: 'export',
  // Mounted under /ide on fabioibanez.com via a Cloudflare Workers Route.
  // basePath makes Next emit assets and HTML under out/ide/* so the
  // request path matches what the static asset server looks up.
  basePath: '/ide',
  images: { unoptimized: true },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
        ],
      },
    ];
  },
};

export default nextConfig;
