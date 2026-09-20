import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Preserve original query keys for the destination-search proxy validator.
  skipProxyUrlNormalize: true,
};

export default nextConfig;
