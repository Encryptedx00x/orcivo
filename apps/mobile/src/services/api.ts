import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import { API_URL } from '../config';

const BASE_URL = API_URL;

async function getHeaders(extra: Record<string, string> = {}): Promise<Record<string, string>> {
  const token = await SecureStore.getItemAsync('access_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}

export const api = {
  async get<T>(path: string): Promise<T> {
    const headers = await getHeaders();
    const res = await fetch(`${BASE_URL}${path}`, { headers });
    if (!res.ok) throw new Error(`GET ${path} ${res.status}`);
    return res.json();
  },

  async post<T>(path: string, body: unknown): Promise<T> {
    const requestId = Crypto.randomUUID();
    const headers = await getHeaders({ 'X-Client-Request-Id': requestId });
    const res = await fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw Object.assign(new Error(`POST ${path} ${res.status}`), { status: res.status, data: err });
    }
    return res.json();
  },

  async postFormData<T>(path: string, formData: FormData): Promise<T> {
    const requestId = Crypto.randomUUID();
    // Omit Content-Type para o browser/fetch definir automaticamente com boundary correto
    const token = await SecureStore.getItemAsync('access_token');
    const headers: Record<string, string> = {
      'X-Client-Request-Id': requestId,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
    const res = await fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      headers,
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw Object.assign(new Error(`POST ${path} ${res.status}`), { status: res.status, data: err });
    }
    return res.json();
  },

  async patch<T>(path: string, body: unknown): Promise<T> {
    const requestId = Crypto.randomUUID();
    const headers = await getHeaders({ 'X-Client-Request-Id': requestId });
    const res = await fetch(`${BASE_URL}${path}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw Object.assign(new Error(`PATCH ${path} ${res.status}`), { status: res.status, data: err });
    }
    return res.json();
  },

  async delete<T>(path: string): Promise<T> {
    const requestId = Crypto.randomUUID();
    const headers = await getHeaders({ 'X-Client-Request-Id': requestId });
    const res = await fetch(`${BASE_URL}${path}`, {
      method: 'DELETE',
      headers,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw Object.assign(new Error(`DELETE ${path} ${res.status}`), { status: res.status, data: err });
    }
    // DELETE pode retornar 204 sem body
    if (res.status === 204) return undefined as unknown as T;
    return res.json();
  },
};
