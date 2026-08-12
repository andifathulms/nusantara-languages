/**
 * Static export for GitHub Pages. `basePath` must match the repository name.
 * No runtime network: no image optimisation endpoint, no font CDN, no analytics.
 */
const repository = 'nusantara-languages'
const isProduction = process.env.NODE_ENV === 'production'

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  basePath: isProduction ? `/${repository}` : '',
  assetPrefix: isProduction ? `/${repository}/` : undefined,
  trailingSlash: true,
  images: { unoptimized: true },
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_BASE_PATH: isProduction ? `/${repository}` : '',
  },
}

module.exports = nextConfig
