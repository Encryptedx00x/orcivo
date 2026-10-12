import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API_URL = process.env['API_URL'] ?? 'http://localhost:3000';

/** Proxy para o PDF do orçamento — injeta token JWT do cookie httpOnly. */
export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const params = await props.params;
  const download = request.nextUrl.searchParams.get('download') === '1';
  const safeId = params.id.replace(/[^a-zA-Z0-9-]/g, '') || 'orcamento';
  const token = (await cookies()).get('access_token')?.value;
  if (!token) {
    return NextResponse.json({ message: 'Não autenticado' }, { status: 401 });
  }

  const res = await fetch(
    `${API_URL}/quotes/${encodeURIComponent(params.id)}/pdf${download ? '?download=1' : ''}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );

  if (!res.ok) {
    const text = await res.text();
    return new NextResponse(text, {
      status: res.status,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const buffer = await res.arrayBuffer();
  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `${download ? 'attachment' : 'inline'}; filename="orcamento-${safeId}.pdf"`,
    },
  });
}
