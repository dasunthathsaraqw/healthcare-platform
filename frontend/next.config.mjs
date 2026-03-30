/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable standalone output for Docker build optimization
  output: "standalone",
  
  // Enable API routes proxying
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        // FIXED: Use the Docker internal network name 'api-gateway' instead of 'localhost'
        // This allows the Next.js container to talk directly to the Gateway container
        destination: "http://api-gateway:8080/api/:path*", 
      },
    ];
  },
  
  // Allow images from localhost
  images: {
    domains: ["localhost"],
  },
  
  // Enable React Compiler
  reactCompiler: true,
};

export default nextConfig;