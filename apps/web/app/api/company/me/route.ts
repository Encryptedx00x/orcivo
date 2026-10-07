import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API_URL = process.env['API_URL'] ?? 'http://localhost:3000';

export async function GET(): Promise<NextResponse> {
  const token = (await cookies()).get('access_token')?.value;
  if (!token) return NextResponse.json({ message: 'Não autenticado' }, { status: 401 });
  const res = await fetch(`${API_URL}/company/me`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
