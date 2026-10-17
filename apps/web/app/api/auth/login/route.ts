import { NextRequest, NextResponse } from 'next/server';
import { setSessionCookies } from '../session-cookies';

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
  if (data.requires_company_selection === true) return NextResponse.json(data);
  await setSessionCookies(data);
  return NextResponse.json({ user: data.user, company: data.company });
}
