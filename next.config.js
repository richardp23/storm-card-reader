const isProd = process.env.NODE_ENV === 'production'
const internalHost = process.env.TAURI_DEV_HOST || 'localhost'

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Ensure Next.js uses SSG instead of SSR
  output: 'export',
  // Note: This feature is required to use NextJS Image in SSG mode
  images: {
    unoptimized: true,
  },
  // Configure assetPrefix for proper asset resolution
  assetPrefix: isProd ? undefined : `http://${internalHost}:3000`,
}

module.exports = nextConfig 