import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "product-images.s3.cardmarket.com",
      },
      {
        protocol: "https",
        hostname: "*.cardmarket.com",
      },
      {
        protocol: "https",
        hostname: "www.pokecardex.com",
      },
    ],
  },
};

export default nextConfig;
