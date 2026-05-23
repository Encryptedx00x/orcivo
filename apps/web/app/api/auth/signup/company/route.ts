import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const apiUrl = process.env['API_URL'] ?? 'http://localhost:3000';
  const token = req.headers.get('x-signup-token') ?? '';
  const res = await fetch(`${apiUrl}/auth/signup/company`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) return NextResponse.json(data, { status: res.status });
  cookies().set('access_token', data.access_token, {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env['NODE_ENV'] === 'production',
    path: '/',
  });
  return NextResponse.json({ user: data.user, company: data.company });
}
