import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest): Promise<NextResponse> {
  const token = (await cookies()).get('access_token')?.value;
  if (!token)
    return NextResponse.json(
      { message: 'Entre na sua conta para aceitar o convite.' },
      { status: 401 },
    );
  const apiUrl = process.env['API_URL'] ?? 'http://localhost:3000';
  const response = await fetch(`${apiUrl}/invites/accept-existing`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(await req.json()),
    cache: 'no-store',
  });
  const text = await response.text();
  return new NextResponse(text, {
    status: response.status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'private, no-store' },
  });
}
