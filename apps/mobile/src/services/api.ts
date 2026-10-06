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

async function getHeaders(extra: Record<string, string> = {}): Promise<Record<string, string>> {
  const token = await SecureStore.getItemAsync('access_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}

async function mutate<T>(
  method: 'POST' | 'PATCH' | 'DELETE',
  path: string,
  body: unknown,
  opts?: WriteOptions,
): Promise<T> {
  const requestId = opts?.idempotencyKey ?? Crypto.randomUUID();
  const headers = await getHeaders({ 'X-Client-Request-Id': requestId });
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
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
    const headers = await getHeaders();
    const res = await fetch(`${BASE_URL}${path}`, { headers });
    if (!res.ok) throw new Error(`GET ${path} ${res.status}`);
    return res.json();
  },

  post<T>(path: string, body: unknown, opts?: WriteOptions): Promise<T> {
    return mutate<T>('POST', path, body, opts);
  },

  patch<T>(path: string, body: unknown, opts?: WriteOptions): Promise<T> {
    return mutate<T>('PATCH', path, body, opts);
  },

  delete<T>(path: string, opts?: WriteOptions): Promise<T> {
    return mutate<T>('DELETE', path, undefined, opts);
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
  const token = await SecureStore.getItemAsync('access_token');
  // Omit Content-Type so fetch sets the multipart boundary itself.
  const headers: Record<string, string> = {
    'X-Client-Request-Id': requestId,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  const res = await fetch(`${BASE_URL}${path}`, { method, headers, body: formData });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw Object.assign(new Error(`${method} ${path} ${res.status}`), {
      status: res.status,
      data: err,
    });
  }
  return res.json();
}
