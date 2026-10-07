import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import { API_URL } from '../config';

const BASE_URL = API_URL;

/**
 * Options for a write call. Pass a stable `idempotencyKey` (one per logical
 * operation, reused on retry) so the backend dedupes replays — see
 * newIdempotencyKey(). Omit it and one is generated per call (no retry safety).
 */
export interface WriteOptions {
  idempotencyKey?: string;
}

/** Create one key per logical operation. Keep it (useRef/useState) and reuse it on retry. */
export const newIdempotencyKey = (): string => Crypto.randomUUID();

let refreshing: Promise<'ok' | 'expired' | 'offline'> | null = null;
let sessionExpired: (() => void) | null = null;

/** AuthContext registers here to go back to the login screen when the session cannot be renewed. */
export function onSessionExpired(cb: (() => void) | null): void {
  sessionExpired = cb;
}

/**
 * Trades the refresh token for a new pair. Single-flight: the backend rotates the refresh token,
 * so parallel 401s must share one call or the second would revoke the session.
 */
export function refreshSession(): Promise<'ok' | 'expired' | 'offline'> {
  refreshing ??= (async () => {
    const refreshToken = await SecureStore.getItemAsync('refresh_token');
    if (!refreshToken) return 'expired' as const;
    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    }).catch(() => null);
    if (!res) return 'offline' as const;
    if (!res.ok) return res.status >= 500 ? ('offline' as const) : ('expired' as const);
    const data = (await res.json()) as { access_token: string; refresh_token?: string };
    await SecureStore.setItemAsync('access_token', data.access_token);
    if (data.refresh_token) await SecureStore.setItemAsync('refresh_token', data.refresh_token);
    return 'ok' as const;
  })().finally(() => {
    refreshing = null;
  });
  return refreshing;
}

/** fetch with the session token; on 401 renews the session once and retries. */
async function authFetch(
  path: string,
  init: RequestInit,
  headers: Record<string, string>,
): Promise<Response> {
  const send = async () => {
    const token = await SecureStore.getItemAsync('access_token');
    return fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: { ...headers, ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    });
  };
  const res = await send();
  if (res.status !== 401 || path.startsWith('/auth/')) return res;
  const renewed = await refreshSession();
  if (renewed === 'ok') return send();
  if (renewed === 'expired') sessionExpired?.();
  return res;
}

async function mutate<T>(
  method: 'POST' | 'PATCH' | 'DELETE',
  path: string,
  body: unknown,
  opts?: WriteOptions,
): Promise<T> {
  const requestId = opts?.idempotencyKey ?? Crypto.randomUUID();
  const res = await authFetch(
    path,
    { method, ...(body === undefined ? {} : { body: JSON.stringify(body) }) },
    { 'Content-Type': 'application/json', 'X-Client-Request-Id': requestId },
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw Object.assign(new Error(`${method} ${path} ${res.status}`), {
      status: res.status,
      data: err,
    });
  }
  if (res.status === 204) return undefined as unknown as T;
  return res.json();
}

export const api = {
  async get<T>(path: string): Promise<T> {
    const res = await authFetch(path, {}, { 'Content-Type': 'application/json' });
    if (!res.ok) throw new Error(`GET ${path} ${res.status}`);
    return res.json();
  },

  post<T>(path: string, body: unknown, opts?: WriteOptions): Promise<T> {
    return mutate<T>('POST', path, body, opts);
  },

  patch<T>(path: string, body: unknown, opts?: WriteOptions): Promise<T> {
    return mutate<T>('PATCH', path, body, opts);
  },

  /** `body` for deletes the backend audits with a reason (e.g. payments). */
  delete<T>(path: string, opts?: WriteOptions, body?: unknown): Promise<T> {
    return mutate<T>('DELETE', path, body, opts);
  },

  postFormData<T>(path: string, formData: FormData, opts?: WriteOptions): Promise<T> {
    return sendFormData<T>('POST', path, formData, opts);
  },

  putFormData<T>(path: string, formData: FormData, opts?: WriteOptions): Promise<T> {
    return sendFormData<T>('PUT', path, formData, opts);
  },
};

async function sendFormData<T>(
  method: 'POST' | 'PUT',
  path: string,
  formData: FormData,
  opts?: WriteOptions,
): Promise<T> {
  const requestId = opts?.idempotencyKey ?? Crypto.randomUUID();
  // Omit Content-Type so fetch sets the multipart boundary itself.
  const res = await authFetch(
    path,
    { method, body: formData },
    { 'X-Client-Request-Id': requestId },
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw Object.assign(new Error(`${method} ${path} ${res.status}`), {
      status: res.status,
      data: err,
    });
  }
  return res.json();
}
