import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const apiUrl = process.env['API_URL'] ?? 'http://localhost:3000';
  const res = await fetch(`${apiUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) return NextResponse.json({ message: 'Credenciais inválidas' }, { status: 401 });
  const data = await res.json();
  const cookieOpts = {
    httpOnly: true,
    sameSite: 'strict' as const,
    secure: process.env['NODE_ENV'] === 'production',
    path: '/',
  };
  (await cookies()).set('access_token', data.access_token, cookieOpts);
  if (data.refresh_token) (await cookies()).set('refresh_token', data.refresh_token, cookieOpts);
  return NextResponse.json({ user: data.user, company: data.company });
}
