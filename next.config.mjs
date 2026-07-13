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

  // Prevent Next.js from bundling these on the server, which breaks their runtime behavior
  serverExternalPackages: [
    "pdfjs-dist",        // Worker script loading breaks when bundled
    "tesseract.js",      // WASM file loading breaks when bundled
  ],
  
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api',
  },
}

export default nextConfig
