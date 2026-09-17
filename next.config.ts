import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Increase Server Actions body limit to accept larger form payloads (images should still go through /api/upload)
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
