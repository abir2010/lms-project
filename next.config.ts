import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    serverActions: {
      allowedOrigins: [
        "localhost:3000",
        "undeputed-crushingly-damion.ngrok-free.dev", // <--- Add your specific Ngrok URL here
      ],
    },
  },
};

export default nextConfig;
