import type { NextConfig } from "next";

// NEXT_OUTPUT=export builds plain static files for S3 + CloudFront (see infra/);
// otherwise the standalone Node server used by the Dockerfile.
const staticExport = process.env.NEXT_OUTPUT === "export";

const nextConfig: NextConfig = {
  reactCompiler: true,
  output: staticExport ? "export" : "standalone",
  // S3 has no routing: every page becomes <route>/index.html.
  trailingSlash: staticExport,
  // On AWS the dashboard is served from /admin on the storefront's domain.
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || undefined,
};

export default nextConfig;
