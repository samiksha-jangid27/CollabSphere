// ABOUTME: Next.js configuration for the CollabSphere client.
// ABOUTME: Whitelists Cloudinary as a remote image source so next/image can render avatars and covers.

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
