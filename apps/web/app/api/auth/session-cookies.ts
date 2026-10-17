import { cookies } from 'next/headers';

const cookieOptions = {
  httpOnly: true,
  sameSite: 'strict' as const,
  secure: process.env['NODE_ENV'] === 'production',
  path: '/',
};

export async function setSessionCookies(data: {
  access_token: string;
  refresh_token?: string;
}): Promise<void> {
  const store = await cookies();
  store.set('access_token', data.access_token, cookieOptions);
  if (data.refresh_token) store.set('refresh_token', data.refresh_token, cookieOptions);
}
