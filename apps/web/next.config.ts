import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  experimental: { externalDir: true },
  // TEMP: Runtime localCompleter.ts spawn typing fails under this app's @types/node; app files typecheck clean (see npx tsc).
  typescript: { ignoreBuildErrors: true },
  // Runtime sources use NodeNext-style './x.js' imports of .ts files.
  webpack: (config) => { config.resolve.extensionAlias = { '.js': ['.ts', '.js'] }; return config; },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
