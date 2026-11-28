import type { NextConfig } from "next";

const apiUrl = (
  process.env.SIHHAT_API_URL ||
  (process.env.VERCEL || process.env.RENDER
    ? "https://sihhat-api.onrender.com"
    : "http://127.0.0.1:4000")
).replace(/\/$/, "");

const config: NextConfig = {
  output: "standalone",
  compress: true,
  transpilePackages: ["@sihhat/ui", "@sihhat/api-client"],
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
  poweredByHeader: false,
  async rewrites() {
    return [
      {
        source: "/demo-api/:path*",
        destination: "http://127.0.0.1:4100/:path*",
      },
      {
        source: "/api/:path*",
        destination: `${apiUrl}/:path*`,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/branding/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/fonts/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "same-origin" },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
    ];
  },
};
export default config;
