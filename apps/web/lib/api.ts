import { cookies } from 'next/headers';

const API_URL = process.env['API_URL'] ?? 'http://localhost:3000';

async function refreshAccessToken(): Promise<string | null> {
  const cookieStore = cookies();
  const refreshToken = cookieStore.get('refresh_token')?.value;
  if (!refreshToken) return null;

  const res = await fetch(`${API_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  if (!res.ok) return null;

  const data = await res.json() as { access_token: string; refresh_token?: string };
  const cookieOpts = { httpOnly: true, sameSite: 'strict' as const, secure: process.env['NODE_ENV'] === 'production', path: '/' };
  cookieStore.set('access_token', data.access_token, cookieOpts);
  if (data.refresh_token) cookieStore.set('refresh_token', data.refresh_token, cookieOpts);

  return data.access_token;
}

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const cookieStore = cookies();
  let token = cookieStore.get('access_token')?.value;

  const doFetch = (t: string | undefined) =>
    fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(t ? { Authorization: `Bearer ${t}` } : {}),
        ...(options?.headers ?? {}),
      },
      cache: 'no-store',
    });

  let res = await doFetch(token);

  if (res.status === 401) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      token = newToken;
      res = await doFetch(token);
    }
  }

  if (!res.ok) throw new Error(`${path} ${res.status}`);
  return res.json();
}
