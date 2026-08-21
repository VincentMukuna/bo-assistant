import type { NextConfig } from "next";
import { randomUUID } from "node:crypto";

import { getBackendUrl } from "./lib/backend-url";

const deploymentId =
  process.env.SOURCE_COMMIT || process.env.COOLIFY_GIT_COMMIT_SHA || randomUUID();

const nextConfig: NextConfig = {
  allowedDevOrigins: ["luna"],
  deploymentId,
  env: { NEXT_PUBLIC_APP_VERSION: deploymentId },
  generateBuildId: async () => deploymentId,
  output: "standalone",
  outputFileTracingRoot: new URL("../..", import.meta.url).pathname,
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${getBackendUrl()}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
