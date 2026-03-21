/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable API routes proxying
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://localhost:8080/api/:path*", // Proxy to API Gateway
      },
    ];
  },
  // Allow CORS
  images: {
    domains: ["localhost"],
  },
  reactCompiler: true,
};

export default nextConfig;
