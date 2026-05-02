import type { NextConfig } from 'next';

// COOP/COEP are required by @jtrb/runtime to use SharedArrayBuffer for stdin.
// Without these the runtime worker will silently break.
const nextConfig: NextConfig = {
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
