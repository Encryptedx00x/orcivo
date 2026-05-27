import Constants from 'expo-constants';

const fromConfig = Constants.expoConfig?.extra?.apiUrl as string | undefined;
const fromEnv = process.env.EXPO_PUBLIC_API_URL;

// Fallback chain: app.config.js extra → env var → dev IP → localhost
export const API_URL: string =
  fromConfig ?? fromEnv ?? 'http://192.168.2.5:3000';
