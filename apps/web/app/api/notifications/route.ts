import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API_URL = process.env['API_URL'] ?? 'http://localhost:3000';
const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'private, no-store' };

export async function GET(req: NextRequest): Promise<NextResponse> {
  const token = cookies().get('access_token')?.value;
  if (!token) return NextResponse.json({ message: 'Não autenticado' }, { status: 401, headers });

  const query = new URLSearchParams();
  for (const key of ['limit', 'cursor']) {
    const value = req.nextUrl.searchParams.get(key);
    if (value !== null) query.set(key, value);
  }
  try {
    const response = await fetch(`${API_URL}/notifications?${query}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    return new NextResponse(await response.text(), { status: response.status, headers });
  } catch {
    return NextResponse.json({ message: 'Notificações indisponíveis.' }, { status: 502, headers });
  }
}
