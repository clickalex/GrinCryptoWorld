/** @type {import('next').NextConfig} */
const rawTarget = process.env.API_PROXY_TARGET || 'http://localhost:4000';
const API_PROXY_TARGET = rawTarget.startsWith('http') ? rawTarget : `https://${rawTarget}`;

const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@grincrypto/shared'],
  async rewrites() {
    // Browser calls relative /api/* URLs; the Next server proxies them to the Express backend.
    // API_PROXY_TARGET may be a bare host (e.g. my-api.onrender.com) — normalize to https://.
    return [
      {
        source: '/api/:path*',
        destination: `${API_PROXY_TARGET}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
