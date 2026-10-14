'use strict';

const DISTRIBUTED_ENVIRONMENTS = new Set(['preview', 'production']);
const DEVELOPMENT_API_URL = 'http://localhost:3000';

function resolveAppEnvironment(env = process.env) {
  const explicit = env.EXPO_PUBLIC_APP_ENV || env.EAS_BUILD_PROFILE;
  if (explicit === 'development' || explicit === 'preview' || explicit === 'production') {
    return explicit;
  }
  return env.NODE_ENV === 'production' ? 'production' : 'development';
}

function isLoopbackHostname(hostname) {
  const normalized = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  return (
    normalized === 'localhost' ||
    normalized === '::1' ||
    normalized === '0.0.0.0' ||
    /^127(?:\.\d{1,3}){3}$/.test(normalized)
  );
}

function assertApiUrl(value, environment) {
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error('EXPO_PUBLIC_API_URL deve ser uma URL HTTP(S) válida.');
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('EXPO_PUBLIC_API_URL deve usar HTTP ou HTTPS.');
  }

  if (DISTRIBUTED_ENVIRONMENTS.has(environment) && isLoopbackHostname(parsed.hostname)) {
    throw new Error(
      `Build ${environment} não pode usar localhost ou endereço de loopback em EXPO_PUBLIC_API_URL.`,
    );
  }

  return parsed.toString().replace(/\/$/, '');
}

function resolveApiUrl(env = process.env) {
  const environment = resolveAppEnvironment(env);
  const configured = env.EXPO_PUBLIC_API_URL?.trim();

  if (!configured && DISTRIBUTED_ENVIRONMENTS.has(environment)) {
    throw new Error(`EXPO_PUBLIC_API_URL é obrigatória para build ${environment}.`);
  }

  return assertApiUrl(configured || DEVELOPMENT_API_URL, environment);
}

module.exports = {
  assertApiUrl,
  isLoopbackHostname,
  resolveApiUrl,
  resolveAppEnvironment,
};
