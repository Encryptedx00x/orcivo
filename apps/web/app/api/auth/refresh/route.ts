import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get('refresh_token')?.value;

  if (!refreshToken) return NextResponse.json({ message: 'Sem refresh token' }, { status: 401 });

  const apiUrl = process.env['API_URL'] ?? 'http://localhost:3000';
  const res = await fetch(`${apiUrl}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  if (!res.ok) {
    cookieStore.delete('access_token');
    cookieStore.delete('refresh_token');
    return NextResponse.json({ message: 'Sessão expirada' }, { status: 401 });
  }

  const data = await res.json();
  const cookieOpts = {
    httpOnly: true,
    sameSite: 'strict' as const,
    secure: process.env['NODE_ENV'] === 'production',
    path: '/',
  };
  cookieStore.set('access_token', data.access_token, cookieOpts);
  if (data.refresh_token) cookieStore.set('refresh_token', data.refresh_token, cookieOpts);

  return NextResponse.json({ ok: true });
}
