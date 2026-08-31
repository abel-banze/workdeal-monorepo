import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@workspace/ui", "@workdeal/auth", "@workdeal/shared", "@workdeal/db"],
};

export default nextConfig;
