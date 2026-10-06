import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API_URL = process.env['API_URL'] ?? 'http://localhost:3000';

async function forward(method: 'PUT' | 'DELETE', body?: FormData): Promise<NextResponse> {
  const token = (await cookies()).get('access_token')?.value;
  if (!token) return NextResponse.json({ message: 'Não autenticado' }, { status: 401 });
  const res = await fetch(`${API_URL}/company/logo`, {
    method,
    headers: { Authorization: `Bearer ${token}` },
    body,
    cache: 'no-store',
  });
  return new NextResponse(await res.text(), {
    status: res.status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** Logo da empresa (multipart "file"): PUT envia, DELETE remove. */
export async function PUT(req: NextRequest): Promise<NextResponse> {
  const form = await req.formData();
  return forward('PUT', form);
}

export function DELETE(): Promise<NextResponse> {
  return forward('DELETE');
}
