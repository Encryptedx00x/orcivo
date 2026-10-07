import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API_URL = process.env['API_URL'] ?? 'http://localhost:3000';

/** Proxy para envio de orçamento — injeta token JWT do cookie httpOnly. */
export async function POST(
  _req: NextRequest,
  props: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const params = await props.params;
  const cookieStore = await cookies();
  const token = cookieStore.get('access_token')?.value;
  if (!token) {
    return NextResponse.json({ message: 'Não autenticado' }, { status: 401 });
  }

  const res = await fetch(`${API_URL}/quotes/${params.id}/send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await res.text();
  return new NextResponse(data, {
    status: res.status,
    headers: { 'Content-Type': 'application/json' },
  });
}
