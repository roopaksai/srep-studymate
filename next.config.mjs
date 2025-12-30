/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable gzip compression for better performance
  compress: true,
  
  typescript: {
    ignoreBuildErrors: false,
  },
  
  images: {
    unoptimized: true,
  },
  
  // Increase body size limit for file uploads
  experimental: {
    serverActions: {
      bodySizeLimit: '30mb',
    },
  },
  
  env: {
    MONGODB_URI: process.env.MONGODB_URI,
    JWT_SECRET: process.env.JWT_SECRET,
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api',
  },
}

export default nextConfig
