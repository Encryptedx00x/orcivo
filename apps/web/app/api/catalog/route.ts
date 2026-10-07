import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API_URL = process.env['API_URL'] ?? 'http://localhost:3000';

/** Proxy para listagem do catálogo — injeta token JWT do cookie httpOnly. */
export async function GET(): Promise<NextResponse> {
  const cookieStore = await cookies();
  const token = cookieStore.get('access_token')?.value;
  if (!token) {
    return NextResponse.json({ message: 'Não autenticado' }, { status: 401 });
  }

  const res = await fetch(`${API_URL}/catalog`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });

  const data = await res.text();
  return new NextResponse(data, {
    status: res.status,
    headers: { 'Content-Type': 'application/json' },
  });
}
