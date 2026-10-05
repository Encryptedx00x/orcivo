import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
  const cookieStore = cookies();
  const refreshToken = cookieStore.get('refresh_token')?.value;
  let revoked = true;
  try {
    if (refreshToken) {
      const apiUrl = process.env['API_URL'] ?? 'http://localhost:3000';
      const response = await fetch(`${apiUrl}/auth/logout/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
        cache: 'no-store',
        signal: AbortSignal.timeout(5000),
      });
      // An expired/invalid refresh is already unusable. Other failures must not
      // be reported as a successful server-side revocation.
      revoked = response.ok || response.status === 401;
    }
  } catch {
    revoked = false;
  } finally {
    cookieStore.delete('access_token');
    cookieStore.delete('refresh_token');
  }
  return revoked
    ? NextResponse.json({ ok: true })
    : NextResponse.json(
        { message: 'Sessão local encerrada; não foi possível confirmar a revogação.' },
        { status: 503 },
      );
}
