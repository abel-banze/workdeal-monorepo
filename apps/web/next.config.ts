import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  transpilePackages: ["@workspace/ui", "@workdeal/auth", "@workdeal/shared", "@workdeal/db"],
  images: {
    remotePatterns: [
      // Cloudinary (upload de logos/publicações) — https only
      { protocol: "https", hostname: "res.cloudinary.com" },
      // Mock usado em dev (files.service.ts)
      { protocol: "http", hostname: "mock.cloudinary.local" },
      { protocol: "https", hostname: "mock.cloudinary.local" },
    ],
  },
  async redirects() {
    return [
      { source: "/empresas", destination: "/companies", permanent: true },
      { source: "/empresas/:path*", destination: "/companies/:path*", permanent: true },
      { source: "/termos", destination: "/terms", permanent: true },
      { source: "/termos/:path*", destination: "/terms/:path*", permanent: true },
      { source: "/privacidade", destination: "/privacy", permanent: true },
      { source: "/privacidade/:path*", destination: "/privacy/:path*", permanent: true },
    ]
  },
}

export default nextConfig
