import type { NextConfig } from "next";
import path from "path";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") ||
  "http://localhost:5000";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  async rewrites() {
    return [
      // Everything under /api goes to the NestJS backend, including
      // /api/webpilot/*: the backend checks the access token before proxying
      // to the WebPilot service, so the service is never reached directly.
      {
        source: "/api/:path*",
        destination: `${BACKEND_URL}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
