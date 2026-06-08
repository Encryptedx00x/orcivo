import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API_URL = process.env['API_URL'] ?? 'http://localhost:3000';

function token(): string | undefined {
  return cookies().get('access_token')?.value;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const t = token();
  if (!t) return NextResponse.json({ message: 'Não autenticado' }, { status: 401 });
  const qs = req.nextUrl.search;
  const res = await fetch(`${API_URL}/payments${qs}`, {
    headers: { Authorization: `Bearer ${t}` },
    cache: 'no-store',
  });
  const data = await res.text();
  return new NextResponse(data, { status: res.status, headers: { 'Content-Type': 'application/json' } });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const t = token();
  if (!t) return NextResponse.json({ message: 'Não autenticado' }, { status: 401 });
  const body = await req.text();
  const res = await fetch(`${API_URL}/payments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
    body,
  });
  const data = await res.text();
  return new NextResponse(data, { status: res.status, headers: { 'Content-Type': 'application/json' } });
}
