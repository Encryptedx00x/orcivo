import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API_URL = process.env['API_URL'] ?? 'http://localhost:3000';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ format: string }> },
): Promise<NextResponse> {
  const { format } = await params;
  if (format !== 'csv' && format !== 'zip')
    return NextResponse.json({ message: 'Formato inválido' }, { status: 400 });
  const token = (await cookies()).get('access_token')?.value;
  if (!token) return NextResponse.json({ message: 'Não autenticado' }, { status: 401 });
  const entity = request.nextUrl.searchParams.get('entity');
  if (
    format === 'csv' &&
    !['customers', 'quotes', 'work_orders', 'payments', 'expenses'].includes(entity ?? '')
  )
    return NextResponse.json({ message: 'Exportação inválida' }, { status: 400 });
  const path =
    format === 'csv'
      ? `/data-export/csv?entity=${encodeURIComponent(entity!)}`
      : '/data-export/zip';
  const response = await fetch(`${API_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!response.ok) return new NextResponse(await response.text(), { status: response.status });
  return new NextResponse(await response.arrayBuffer(), {
    headers: {
      'Content-Type': response.headers.get('content-type') ?? 'application/octet-stream',
      'Content-Disposition': response.headers.get('content-disposition') ?? 'attachment',
      'Cache-Control': 'no-store',
    },
  });
}
