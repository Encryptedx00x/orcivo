import { cookies } from 'next/headers';

const API_URL = process.env['API_URL'] ?? 'http://localhost:3000';

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const cookieStore = cookies();
  const token = cookieStore.get('access_token')?.value;
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options?.headers ?? {}),
    },
    cache: 'no-store',
  });
  if (!res.ok) {
    // Keep "<path> <status>" (callers read the status) and carry the backend's own message,
    // e.g. "Sua assinatura está inativa…" is not the same as a role without permission.
    const body = (await res.json().catch(() => null)) as { message?: unknown } | null;
    throw Object.assign(new Error(`${path} ${res.status}`), {
      status: res.status,
      serverMessage: typeof body?.message === 'string' ? body.message : undefined,
    });
  }
  return res.json();
}
