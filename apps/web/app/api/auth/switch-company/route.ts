import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { setSessionCookies } from '../session-cookies';

export async function POST(req: NextRequest): Promise<NextResponse> {
  const store = await cookies();
  const accessToken = store.get('access_token')?.value;
  const refreshToken = store.get('refresh_token')?.value;
  if (!accessToken || !refreshToken)
    return NextResponse.json({ message: 'Sessão expirada.' }, { status: 401 });

  const body = (await req.json()) as { company_id?: unknown };
  const apiUrl = process.env['API_URL'] ?? 'http://localhost:3000';
  const response = await fetch(`${apiUrl}/auth/switch-company`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ company_id: body.company_id, refresh_token: refreshToken }),
    cache: 'no-store',
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) return NextResponse.json(data, { status: response.status });
  await setSessionCookies(data);
  return NextResponse.json({ user: data.user, company: data.company });
}
