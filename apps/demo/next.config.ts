import type { NextConfig } from "next";

import { getBackendUrl } from "./lib/backend-url";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["luna"],
  reactStrictMode: true,
  async rewrites() {
    if (process.env.NODE_ENV === "production") return [];

    return [
      {
        source: "/api/:path*",
        destination: `${getBackendUrl()}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
