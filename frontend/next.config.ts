import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    outputFileTracingExcludes: {
      '*': [
        'node_modules/@swc/core*',
        'node_modules/typescript',
        'node_modules/prettier',
      ],
    },
  },
  images: {
    domains: ["lh3.googleusercontent.com", "cdn.discordapp.com", "avatars.githubusercontent.com"],
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001",
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:3001",
  },
};

export default nextConfig;
