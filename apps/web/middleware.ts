import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const publicPaths = ['/login', '/signup'];

function jwtExpiresAt(token: string): number {
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
    return (payload.exp as number) ?? 0;
  } catch {
    return 0;
  }
}

async function tryRefresh(req: NextRequest): Promise<{ accessToken: string; refreshToken: string } | null> {
  const refreshToken = req.cookies.get('refresh_token')?.value;
  if (!refreshToken) return null;

  const apiUrl = process.env['API_URL'] ?? 'http://localhost:3000';
  try {
    const res = await fetch(`${apiUrl}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!res.ok) return null;
    const data = await res.json() as { access_token: string; refresh_token?: string };
    return { accessToken: data.access_token, refreshToken: data.refresh_token ?? refreshToken };
  } catch {
    return null;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const accessToken = req.cookies.get('access_token')?.value;

  if (publicPaths.some(p => pathname.startsWith(p))) {
    if (accessToken) return NextResponse.redirect(new URL('/clientes', req.url));
    return NextResponse.next();
  }

  if (!accessToken) return NextResponse.redirect(new URL('/login', req.url));

  // Se o token expira nos próximos 60s, tenta renovar proativamente
  const exp = jwtExpiresAt(accessToken);
  const nowSec = Math.floor(Date.now() / 1000);
  if (exp - nowSec < 60) {
    const refreshed = await tryRefresh(req);
    if (!refreshed) return NextResponse.redirect(new URL('/login', req.url));

    const res = NextResponse.next();
    const cookieOpts = { httpOnly: true, sameSite: 'strict' as const, secure: process.env['NODE_ENV'] === 'production', path: '/' };
    res.cookies.set('access_token', refreshed.accessToken, cookieOpts);
    res.cookies.set('refresh_token', refreshed.refreshToken, cookieOpts);
    return res;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
