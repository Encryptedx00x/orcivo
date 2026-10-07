import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API_URL = process.env['API_URL'] ?? 'http://localhost:3000';

/** Proxy de upload de foto para o backend. Injeta o token JWT via cookie httpOnly. */
export async function POST(
  req: NextRequest,
  props: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const params = await props.params;
  const cookieStore = await cookies();
  const token = cookieStore.get('access_token')?.value;
  if (!token) {
    return NextResponse.json({ message: 'Não autenticado' }, { status: 401 });
  }

  const formData = await req.formData();

  const res = await fetch(`${API_URL}/work-orders/${params.id}/photos`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json({ message: text }, { status: res.status });
  }

  const data = await res.json();
  return NextResponse.json(data);
}
