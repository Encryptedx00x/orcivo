const { resolveApiUrl, resolveAppEnvironment } = require('./src/config/api-environment.cjs');

const appEnvironment = resolveAppEnvironment(process.env);

module.exports = {
  expo: {
    name: 'Orcivo',
    slug: 'orcivo',
    version: '0.0.1',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    splash: {
      image: './assets/splash.png',
      resizeMode: 'contain',
      backgroundColor: '#FFFFFF',
    },
    ios: {
      supportsTablet: false,
      bundleIdentifier: 'com.orcivo.app',
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#6D28D9',
      },
      package: 'com.orcivo.app',
    },
    plugins: ['expo-secure-store'],
    extra: {
      apiUrl: resolveApiUrl(process.env),
      appEnvironment,
      webUrl: process.env.EXPO_PUBLIC_WEB_URL || 'https://app.orcivo.com.br',
      eas: {
        projectId: '8e7221e2-7469-4967-90f2-28e019ed93d8',
      },
    },
  },
};
