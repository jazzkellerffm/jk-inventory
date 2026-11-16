import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [{
      source: "/",
      has: [{ type: "host", value: "staff\\.jazzkeller\\.com" }],
      destination: "/staff",
      permanent: false,
    }];
  },
  async rewrites() {
    return [{ source: "/inventory", destination: "/" }];
  },
};

export default nextConfig;
