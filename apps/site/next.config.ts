import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Standalone tracing needs symlink privileges that this Windows environment lacks.
  output: process.platform === 'win32' ? undefined : 'standalone',
  poweredByHeader: false,
};

export default nextConfig;
