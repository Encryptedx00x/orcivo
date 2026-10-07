import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API_URL = process.env['API_URL'] ?? 'http://localhost:3000';

export async function PATCH(
  req: NextRequest,
  props: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const params = await props.params;
  const t = (await cookies()).get('access_token')?.value;
  if (!t) return NextResponse.json({ message: 'Não autenticado' }, { status: 401 });
  const body = await req.text();
  const res = await fetch(`${API_URL}/payments/${params.id}/settle`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
    body: body || '{}',
  });
  const data = await res.text();
  return new NextResponse(data, {
    status: res.status,
    headers: { 'Content-Type': 'application/json' },
  });
}
