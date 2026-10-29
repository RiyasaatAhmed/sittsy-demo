import { PHASE_DEVELOPMENT_SERVER } from "next/constants";
import type { NextConfig } from "next";

// Where `next dev` forwards /api/* (the Express API started by `npm run dev`).
const API_ORIGIN = process.env.API_ORIGIN ?? "http://localhost:4000";

const shared: NextConfig = {
  // The shared domain package is TypeScript source; Next.js compiles it.
  transpilePackages: ["@sitter/domain"],
};

/**
 * The web app has no server of its own: `next build` exports static files
 * (served by nginx, which also proxies /api to the Express API). Rewrites are
 * not allowed in export mode, so only the development server proxies /api.
 */
export default function nextConfig(phase: string): NextConfig {
  if (phase === PHASE_DEVELOPMENT_SERVER) {
    return {
      ...shared,
      rewrites: async () => [{ source: "/api/:path*", destination: `${API_ORIGIN}/api/:path*` }],
    };
  }
  return {
    ...shared,
    output: "export",
    // No image optimisation server in a static export (the avatars are inline SVGs anyway).
    images: { unoptimized: true },
  };
}
