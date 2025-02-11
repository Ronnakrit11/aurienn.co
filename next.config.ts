import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    ppr: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'chart.googleapis.com',
        port: '',
        pathname: '/chart/**',
      },
      {
        protocol: 'https',
        hostname: 'google.com',
        port: '',
        pathname: '/**'
      },
      {
        protocol: 'https',
        hostname: 'codexth.com',
        port: '',
        pathname: '/**'
      },
      {
        protocol: 'http',
        hostname: 'codexth.com',
        port: '',
        pathname: '/**'
      }
    ],
  },
};

export default nextConfig;