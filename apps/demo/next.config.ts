import type { NextConfig } from "next";

import { getBackendUrl } from "./lib/backend-url";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["luna"],
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
