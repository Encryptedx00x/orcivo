import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API_URL = process.env['API_URL'] ?? 'http://localhost:3000';
const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'private, no-store' };

export async function PATCH(
  _: Request,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const token = cookies().get('access_token')?.value;
  if (!token) return NextResponse.json({ message: 'Não autenticado' }, { status: 401, headers });

  try {
    const response = await fetch(`${API_URL}/notifications/${params.id}/read`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    return new NextResponse(await response.text(), { status: response.status, headers });
  } catch {
    return NextResponse.json(
      { message: 'Não foi possível marcar a notificação como lida.' },
      { status: 502, headers },
    );
  }
}
