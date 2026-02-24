import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: "/api/:path((?!checkout|webhook).*)",
        destination: isDev
          ? "http://localhost:8000/api/:path*" // Local Python server
          : "/api", // Vercel serverless function
      },
    ];
  },
};

export default nextConfig;
