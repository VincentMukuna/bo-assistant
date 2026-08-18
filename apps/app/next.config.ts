import type { NextConfig } from "next";

import { getBackendUrl } from "./lib/backend-url";

const nextConfig: NextConfig = {
  allowedDevOrigins:["luna"],
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
