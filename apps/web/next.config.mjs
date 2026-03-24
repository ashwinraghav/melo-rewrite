/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static export for Firebase Hosting CDN
  output: 'export',

  // next/image optimization isn't available in static export
  images: {
    unoptimized: true,
  },

  // Expose API URL to the client (non-secret)
  env: {
    NEXT_PUBLIC_API_URL: process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:8080',
  },
}

export default nextConfig
