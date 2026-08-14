import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async rewrites() {
    const apiInternalUrl = (
      process.env.API_INTERNAL_URL ?? "http://127.0.0.1:3001"
    ).replace(/\/$/, "");

    return [
      {
        source: "/api/:path*",
        destination: `${apiInternalUrl}/:path*`,
      },
    ];
  },
};

export default nextConfig;
