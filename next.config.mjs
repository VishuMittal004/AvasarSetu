/** @type {import('next').NextConfig} */
const requestedDistDir = process.env.CC_NEXT_DIST_DIR
const distDir = requestedDistDir && /^\.?[A-Za-z0-9_-]+$/.test(requestedDistDir)
  ? requestedDistDir
  : '.next'

const nextConfig = {
  // Allows builds to use a separate output folder while `next dev` is running.
  distDir,
}

export default nextConfig
