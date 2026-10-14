import Constants from 'expo-constants';
import apiEnvironment from './config/api-environment.cjs';

const fromConfig = Constants.expoConfig?.extra?.apiUrl as string | undefined;
const fromEnv = process.env.EXPO_PUBLIC_API_URL;
const appEnvironment =
  (Constants.expoConfig?.extra?.appEnvironment as
    | 'development'
    | 'preview'
    | 'production'
    | undefined) ?? apiEnvironment.resolveAppEnvironment(process.env);

export const API_URL: string = apiEnvironment.assertApiUrl(
  fromConfig ?? fromEnv ?? 'http://localhost:3000',
  appEnvironment,
);

/** Web app origin, used to rebuild a quote's public approval link (/approve/:token). */
export const WEB_URL: string =
  (Constants.expoConfig?.extra?.webUrl as string | undefined) ??
  process.env.EXPO_PUBLIC_WEB_URL ??
  'https://app.orcivo.com.br';
