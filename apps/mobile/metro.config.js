const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [monorepoRoot];
// Other apps' build output is not part of the mobile bundle.
config.resolver.blockList = [/apps[\\/](web|site|admin)[\\/]\.next[\\/].*/];

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// Local QA in the browser (`expo start --web`): expo-secure-store has no web build.
const webShims = {
  'expo-secure-store': path.resolve(projectRoot, 'web-shims/expo-secure-store.js'),
};
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && webShims[moduleName]) {
    return { type: 'sourceFile', filePath: webShims[moduleName] };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
