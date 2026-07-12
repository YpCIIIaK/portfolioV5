import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // GramJS (telegram) is a heavy Node-only lib with its own crypto/ws — keep it
  // external so Next doesn't try to bundle it into the serverless function.
  serverExternalPackages: ["telegram"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
    ],
  },
};

export default nextConfig;
