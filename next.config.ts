import type { NextConfig } from "next";

const backendApiBase = (process.env.NEXT_PUBLIC_API_BASE_URL ||
  "https://easy-ride-backend-adyr.onrender.com/api/v1").replace(/\/+$/, "");
const parsedBackendApiBase = new URL(backendApiBase);
if (!parsedBackendApiBase.pathname.replace(/\/+$/, "").endsWith("/api/v1") ||
    (process.env.NODE_ENV === "production" && parsedBackendApiBase.protocol !== "https:")) {
  throw new Error("NEXT_PUBLIC_API_BASE_URL must be an HTTPS URL ending in /api/v1 for production.");
}

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      { source: "/api/v1", destination: backendApiBase },
      { source: "/api/v1/:path*", destination: `${backendApiBase}/:path*` },
      { source: "/health/:path*", destination: `${parsedBackendApiBase.origin}/health/:path*` },
    ];
  },
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "firebasestorage.googleapis.com",
      },
    ],
  },
};

export default nextConfig;

void import("@opennextjs/cloudflare").then((module) => module.initOpenNextCloudflareForDev());
