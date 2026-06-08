import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API_URL = process.env['API_URL'] ?? 'http://localhost:3000';

export async function GET(): Promise<NextResponse> {
  const token = cookies().get('access_token')?.value;
  if (!token) return NextResponse.json({ message: 'Não autenticado' }, { status: 401 });
  const res = await fetch(`${API_URL}/company/members`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  const data = await res.text();
  return new NextResponse(data, { status: res.status, headers: { 'Content-Type': 'application/json' } });
}
