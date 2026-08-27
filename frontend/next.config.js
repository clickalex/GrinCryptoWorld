/** @type {import('next').NextConfig} */
const API_PROXY_TARGET = process.env.API_PROXY_TARGET || 'http://localhost:4000';

const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@grincrypto/shared'],
  async rewrites() {
    // Browser calls relative /api/* URLs; the Next server proxies them to the Express backend.
    return [
      {
        source: '/api/:path*',
        destination: `${API_PROXY_TARGET}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
