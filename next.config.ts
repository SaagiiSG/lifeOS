import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    '@tldraw/utils',
    '@tldraw/state',
    '@tldraw/state-react',
    '@tldraw/store',
    '@tldraw/validate',
    '@tldraw/tlschema',
    '@tldraw/editor',
    'tldraw',
  ],
  // Turbopack config for Next.js 16
  turbopack: {
    resolveAlias: {
      // Ensure single instance of tldraw packages
    },
  },
};

export default nextConfig;
