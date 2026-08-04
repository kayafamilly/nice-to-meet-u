import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  reactStrictMode: true,
  typedRoutes: true,
  turbopack: {
    root: path.join(__dirname, "../..")
  },
  images: {
    remotePatterns: []
  }
};

export default nextConfig;
