import type { NextConfig } from 'next';
import path from 'node:path';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/lib/i18n/request.ts');

const nextConfig: NextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: path.resolve(__dirname),
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000', '*.euw.devtunnels.ms'],
    },
  },
};

export default withNextIntl(nextConfig);
