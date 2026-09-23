/** @type {import('next').NextConfig} */

// STATIC_EXPORT=1 produces a plain HTML/CSS/JS bundle in ./out for static hosts
// such as cPanel. API routes are server-only and are excluded from that build.
const staticExport = process.env.STATIC_EXPORT === '1';

const nextConfig = {
  images: {
    unoptimized: staticExport,
    remotePatterns: [{ protocol: 'https', hostname: '**' }]
  },
  ...(staticExport ? { output: 'export', trailingSlash: true } : {})
};

export default nextConfig;
