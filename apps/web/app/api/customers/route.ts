import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API_URL = process.env['API_URL'] ?? 'http://localhost:3000';

export async function POST(req: Request): Promise<NextResponse> {
  const cookieStore = cookies();
  const token = cookieStore.get('access_token')?.value;
  if (!token) return NextResponse.json({ message: 'Não autenticado' }, { status: 401 });
  const body = await req.json();
  const res = await fetch(`${API_URL}/customers`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.text();
  return new NextResponse(data, { status: res.status, headers: { 'Content-Type': 'application/json' } });
}

/** Proxy para listagem de clientes — injeta token JWT do cookie httpOnly. */
export async function GET(): Promise<NextResponse> {
  const cookieStore = cookies();
  const token = cookieStore.get('access_token')?.value;
  if (!token) {
    return NextResponse.json({ message: 'Não autenticado' }, { status: 401 });
  }

  const res = await fetch(`${API_URL}/customers`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });

  const data = await res.text();
  return new NextResponse(data, {
    status: res.status,
    headers: { 'Content-Type': 'application/json' },
  });
}
