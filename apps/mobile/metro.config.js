const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [monorepoRoot];

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];
// pnpm hoists deps as symlinks; Metro's default resolver doesn't follow
// them, which only breaks on a fresh EAS Build install (remote worker),
// never locally where node_modules is already resolved on disk.
config.resolver.unstable_enableSymlinks = true;

module.exports = config;
