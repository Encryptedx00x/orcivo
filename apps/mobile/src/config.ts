import Constants from 'expo-constants';

const fromConfig = Constants.expoConfig?.extra?.apiUrl as string | undefined;
const fromEnv = process.env.EXPO_PUBLIC_API_URL;

// Fallback chain: app.config.js extra → env var → dev IP → localhost
export const API_URL: string = fromConfig ?? fromEnv ?? 'http://192.168.2.5:3000';

/** Web app origin, used to rebuild a quote's public approval link (/approve/:token). */
export const WEB_URL: string =
  (Constants.expoConfig?.extra?.webUrl as string | undefined) ??
  process.env.EXPO_PUBLIC_WEB_URL ??
  'https://app.orcivo.com.br';
