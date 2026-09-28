import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API_URL = process.env['API_URL'] ?? 'http://localhost:3000';
const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'private, no-store' };

export async function GET(req: NextRequest): Promise<NextResponse> {
  const token = cookies().get('access_token')?.value;
  if (!token) return NextResponse.json({ message: 'Não autenticado' }, { status: 401, headers });

  const query = new URLSearchParams();
  for (const key of ['entity_type', 'entity_id', 'limit', 'cursor']) {
    const value = req.nextUrl.searchParams.get(key);
    if (value !== null) query.set(key, value);
  }
  try {
    const res = await fetch(`${API_URL}/audit-logs?${query}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    return new NextResponse(await res.text(), { status: res.status, headers });
  } catch {
    return NextResponse.json({ message: 'Histórico indisponível.' }, { status: 502, headers });
  }
}
