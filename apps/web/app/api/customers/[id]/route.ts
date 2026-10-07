import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API_URL = process.env['API_URL'] ?? 'http://localhost:3000';

async function getToken(): Promise<string | undefined> {
  return (await cookies()).get('access_token')?.value;
}

export async function GET(
  _req: Request,
  props: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const params = await props.params;
  const token = await getToken();
  if (!token) return NextResponse.json({ message: 'Não autenticado' }, { status: 401 });

  const res = await fetch(`${API_URL}/customers/${params.id}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });

  const data = await res.text();
  return new NextResponse(data, {
    status: res.status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function PATCH(
  req: Request,
  props: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const params = await props.params;
  const token = await getToken();
  if (!token) return NextResponse.json({ message: 'Não autenticado' }, { status: 401 });

  const body = await req.json();
  const res = await fetch(`${API_URL}/customers/${params.id}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await res.text();
  return new NextResponse(data, {
    status: res.status,
    headers: { 'Content-Type': 'application/json' },
  });
}
