import path from 'node:path';
import { fileURLToPath } from 'node:url';

const monorepoRoot = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..',
);

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Standalone tracing needs symlink privileges that this Windows environment lacks.
  output: process.platform === 'win32' ? undefined : 'standalone',
  experimental: {
    outputFileTracingRoot: monorepoRoot,
  },
  poweredByHeader: false,
};

export default nextConfig;
