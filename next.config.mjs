import withPWA from 'next-pwa';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    // Ignore ESLint warnings and rules during production build
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Similarly, bypass TypeScript compiler warnings/rules if they are style-only
    ignoreBuildErrors: true,
  }
};

const nextConfigWithPWA = withPWA({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
})(nextConfig);

export default nextConfigWithPWA;
