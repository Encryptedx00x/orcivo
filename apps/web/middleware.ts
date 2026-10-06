import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const publicPaths = ['/login', '/signup'];
// Acessíveis com ou sem sessão (sem redirecionar quem já está logado): /convite precisa
// funcionar para quem aceita convite de outra empresa estando logado na própria conta.
// Os proxies /submit de cada rota são cobertos pelo mesmo prefixo.
const alwaysPublicPaths = ['/approve', '/forgot-password', '/reset-password', '/convite'];

function jwtExpiresAt(token: string): number {
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
    return (payload.exp as number) ?? 0;
  } catch {
    return 0;
  }
}

async function tryRefresh(
  req: NextRequest,
): Promise<{ accessToken: string; refreshToken: string } | null> {
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
    const data = (await res.json()) as { access_token: string; refresh_token?: string };
    return { accessToken: data.access_token, refreshToken: data.refresh_token ?? refreshToken };
  } catch {
    return null;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const accessToken = req.cookies.get('access_token')?.value;

  if (alwaysPublicPaths.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // API proxies (/api/*) answer for themselves (401 JSON, never a redirect); the
  // middleware only renews an expiring token so browser calls keep working after
  // the 15-minute access token runs out. Auth routes manage their own cookies.
  const isApi = pathname.startsWith('/api/');
  if (isApi && (pathname.startsWith('/api/auth/') || !req.cookies.get('refresh_token'))) {
    return NextResponse.next();
  }

  if (publicPaths.some((p) => pathname.startsWith(p))) {
    if (accessToken) return NextResponse.redirect(new URL('/dashboard', req.url));
    return NextResponse.next();
  }

  if (!accessToken && !isApi) return NextResponse.redirect(new URL('/login', req.url));

  // Se o token expira nos próximos 60s (ou já sumiu), tenta renovar proativamente
  const exp = accessToken ? jwtExpiresAt(accessToken) : 0;
  const nowSec = Math.floor(Date.now() / 1000);
  if (exp - nowSec < 60) {
    const refreshed = await tryRefresh(req);
    if (!refreshed) {
      return isApi ? NextResponse.next() : NextResponse.redirect(new URL('/login', req.url));
    }

    // Hand the fresh token to this same request too: pages and server actions read the
    // request cookies, so setting it only on the response left them with the expired one.
    req.cookies.set('access_token', refreshed.accessToken);
    req.cookies.set('refresh_token', refreshed.refreshToken);
    const res = NextResponse.next({ request: { headers: req.headers } });
    const cookieOpts = {
      httpOnly: true,
      sameSite: 'strict' as const,
      secure: process.env['NODE_ENV'] === 'production',
      path: '/',
    };
    res.cookies.set('access_token', refreshed.accessToken, cookieOpts);
    res.cookies.set('refresh_token', refreshed.refreshToken, cookieOpts);
    return res;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
