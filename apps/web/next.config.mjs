/** @type {import('next').NextConfig} */
const nextConfig = {
  // Output standalone bundle for Docker / Cloud Run
  output: 'standalone',

  // Allow images served from GCS signed URLs
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com',
      },
      {
        protocol: 'https',
        hostname: '*.googleapis.com',
      },
    ],
  },

  // Expose API URL to the client (non-secret)
  env: {
    NEXT_PUBLIC_API_URL: process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:8080',
  },
}

export default nextConfig
