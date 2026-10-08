import type { NextConfig } from "next";
import path from "path";

// The browser always calls this app's own /api path (see src/lib/api.ts) and
// this rewrite proxies it to the NestJS backend. Keeping the API same-origin
// makes the HttpOnly session and CSRF cookies first-party; when the browser
// called the Cloud Run URL directly they were third-party cookies, which
// Safari, iOS, Brave and private windows drop, so sign-in never stuck.
const BACKEND_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api"
).replace(/\/api\/?$/, "");

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  async rewrites() {
    return [
      // Everything under /api goes to the NestJS backend.
      {
        source: "/api/:path*",
        destination: `${BACKEND_URL}/api/:path*`,
      },
    ];
  },
  async redirects() {
    return [
      // The default Vercel domain serves the same site; send it to the canonical
      // domain so search engines index one copy. /api is left alone so in-flight
      // sessions on the old host keep working.
      {
        source: "/:path((?!api/).*)",
        has: [{ type: "host", value: "agentreach-frontend-rho.vercel.app" }],
        destination: "https://www.reachconvert.site/:path",
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        // API responses are per-user; never let the CDN cache them.
        source: "/api/:path*",
        headers: [{ key: "x-vercel-enable-rewrite-caching", value: "0" }],
      },
    ];
  },
};

export default nextConfig;
