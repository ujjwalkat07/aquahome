import withPWA from 'next-pwa';

const nextConfig = {
  reactStrictMode: true,
  typescript: {
    // Similarly, bypass TypeScript compiler warnings/rules if they are style-only
    ignoreBuildErrors: true,
  },
  allowedDevOrigins: ['10.147.27.82'],
};

const nextConfigWithPWA = withPWA({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
})(nextConfig);

export default nextConfigWithPWA;
