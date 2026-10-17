import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const apiUrl = process.env['API_URL'] ?? 'http://localhost:3000';

async function token(): Promise<string | undefined> {
  return (await cookies()).get('access_token')?.value;
}

async function proxy(method: 'GET' | 'POST', body?: unknown): Promise<NextResponse> {
  const accessToken = await token();
  if (!accessToken) return NextResponse.json({ message: 'Não autenticado.' }, { status: 401 });
  const response = await fetch(`${apiUrl}/companies`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    cache: 'no-store',
  });
  return new NextResponse(await response.text(), {
    status: response.status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'private, no-store' },
  });
}

export function GET(): Promise<NextResponse> {
  return proxy('GET');
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  return proxy('POST', await req.json());
}
