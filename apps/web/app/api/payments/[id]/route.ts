import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API_URL = process.env['API_URL'] ?? 'http://localhost:3000';

// The id is read from the URL so the handler signature stays the same across Next versions.
function paymentId(req: NextRequest): string | null {
  const id = req.nextUrl.pathname.split('/').filter(Boolean).pop() ?? '';
  return /^[0-9a-f-]{36}$/i.test(id) ? id : null;
}

async function forward(
  req: NextRequest,
  method: 'GET' | 'PATCH' | 'DELETE',
): Promise<NextResponse> {
  const id = paymentId(req);
  if (!id) return NextResponse.json({ message: 'Recebimento inválido' }, { status: 400 });
  const token = (await cookies()).get('access_token')?.value;
  if (!token) return NextResponse.json({ message: 'Não autenticado' }, { status: 401 });

  const body = method === 'GET' ? undefined : await req.text();
  const res = await fetch(`${API_URL}/payments/${id}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body || undefined,
    cache: 'no-store',
  });
  return new NextResponse(await res.text(), {
    status: res.status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** Proxy de um recebimento: detalhe, edição (com justificativa) e exclusão (com justificativa). */
export function GET(req: NextRequest): Promise<NextResponse> {
  return forward(req, 'GET');
}
export function PATCH(req: NextRequest): Promise<NextResponse> {
  return forward(req, 'PATCH');
}
export function DELETE(req: NextRequest): Promise<NextResponse> {
  return forward(req, 'DELETE');
}
