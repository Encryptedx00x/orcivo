import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API_URL = process.env['API_URL'] ?? 'http://localhost:3000';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; photoId: string } },
): Promise<NextResponse> {
  const cookieStore = cookies();
  const token = cookieStore.get('access_token')?.value;
  if (!token) {
    return NextResponse.json({ message: 'Não autenticado' }, { status: 401 });
  }

  const res = await fetch(`${API_URL}/work-orders/${params.id}/photos/${params.photoId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json({ message: text }, { status: res.status });
  }

  return new NextResponse(null, { status: 204 });
}
