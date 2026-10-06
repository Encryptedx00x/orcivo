import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API_URL = process.env['API_URL'] ?? 'http://localhost:3000';
const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'private, no-store' };

export async function PATCH(): Promise<NextResponse> {
  const token = (await cookies()).get('access_token')?.value;
  if (!token) return NextResponse.json({ message: 'Não autenticado' }, { status: 401, headers });

  try {
    const response = await fetch(`${API_URL}/notifications/read-all`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    return new NextResponse(await response.text(), { status: response.status, headers });
  } catch {
    return NextResponse.json(
      { message: 'Não foi possível marcar as notificações como lidas.' },
      { status: 502, headers },
    );
  }
}
