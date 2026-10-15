import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env['API_URL'] ?? 'http://localhost:3000';

export async function PATCH(
  request: NextRequest,
  props: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const token = (await cookies()).get('access_token')?.value;
  if (!token) return NextResponse.json({ message: 'Não autenticado' }, { status: 401 });

  const params = await props.params;
  const res = await fetch(`${API_URL}/work-orders/${params.id}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(await request.json()),
  });
  const data = await res.text();
  return new NextResponse(data, {
    status: res.status,
    headers: { 'Content-Type': 'application/json' },
  });
}
