import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  // The template bundle is uploaded into the render sandbox; ship it with the routes that render.
  outputFileTracingIncludes: {
    "/api/kits/[id]/export": ["./remotion-bundle/**/*"],
    "/api/render/warm": ["./remotion-bundle/**/*"],
  },
  serverExternalPackages: ["@remotion/vercel", "@vercel/sandbox"],
  partialPrefetching: true,
  turbopack: {
    // Pin the root to this project (a stray lockfile in the home folder confuses detection).
    root: __dirname,
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
