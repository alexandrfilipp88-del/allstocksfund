import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async redirects() {
    return [
      { source: "/holdings", destination: "/#holdings", permanent: false },
      { source: "/about", destination: "/#about", permanent: false },
    ];
  },
  async headers() {
    return [
      {
        source: "/data/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Cache-Control", value: "public, max-age=60, stale-while-revalidate=600" },
        ],
      },
    ];
  },
};

export default nextConfig;
