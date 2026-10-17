import { NextRequest, NextResponse } from 'next/server';
import { setSessionCookies } from '../session-cookies';

export async function POST(req: NextRequest): Promise<NextResponse> {
  const apiUrl = process.env['API_URL'] ?? 'http://localhost:3000';
  const response = await fetch(`${apiUrl}/auth/select-company`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(await req.json()),
    cache: 'no-store',
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) return NextResponse.json(data, { status: response.status });
  await setSessionCookies(data);
  return NextResponse.json({ user: data.user, company: data.company });
}
