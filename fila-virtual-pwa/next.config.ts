import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  // Disable image optimization since Cloudflare Pages static hosting doesn't support the Next.js image server natively
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
