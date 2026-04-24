import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: ['lucide-react', 'framer-motion', 'mermaid'],
  },
  images: {
    remotePatterns: [],
  },
};

export default nextConfig;
