/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['@napi-rs/keyring'],
  devIndicators: false,
}

export default nextConfig
