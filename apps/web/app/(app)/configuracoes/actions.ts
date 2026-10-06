'use server';

import { cookies } from 'next/headers';

type Result = { ok: true } | { ok: false; message: string };
type Account = { id: string; name: string; email: string };
type AccountResult =
  | { ok: true; account: Account; passwordChanged: boolean }
  | { ok: false; message: string };

async function patchCompanyMe(body: Record<string, unknown>): Promise<Result> {
  const token = cookies().get('access_token')?.value;
  if (!token) return { ok: false, message: 'Sua sessão expirou. Entre novamente.' };
  try {
    const response = await fetch(
      `${process.env['API_URL'] ?? 'http://localhost:3000'}/company/me`,
      {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        cache: 'no-store',
      },
    );
    if (!response.ok) {
      if (response.status === 400) {
        const data = (await response.json().catch(() => null)) as { errors?: string[] } | null;
        return {
          ok: false,
          message: data?.errors?.join(' ') || 'Confira os campos e tente novamente.',
        };
      }
      const messages: Record<number, string> = {
        401: 'Sua sessão expirou. Entre novamente.',
        403: 'Você não tem permissão para alterar os dados da empresa.',
        404: 'Empresa não encontrada. Atualize a página.',
      };
      return {
        ok: false,
        message:
          messages[response.status] ?? 'Não foi possível salvar a alteração. Tente novamente.',
      };
    }
    return { ok: true };
  } catch {
    return { ok: false, message: 'Não foi possível conectar. Tente novamente.' };
  }
}

export async function updateCompanyProfile(body: {
  trade_name: string;
  document: string | null;
  phone: string | null;
  city: string | null;
  state: string | null;
}): Promise<Result> {
  return patchCompanyMe(body);
}

export async function updateCompanyPix(body: {
  pix_key_type: string;
  pix_key: string;
}): Promise<Result> {
  return patchCompanyMe(body);
}

/** Configurações > Condições padrão (prefilled on every new quote). */
export async function updateQuoteDefaults(body: {
  quote_default_terms: string | null;
  quote_default_validity_days: number;
}): Promise<Result> {
  return patchCompanyMe(body);
}

export async function getAccountSettings(): Promise<AccountResult> {
  const token = cookies().get('access_token')?.value;
  if (!token) return { ok: false, message: 'Sua sessão expirou. Entre novamente.' };

  try {
    const response = await fetch(
      `${process.env['API_URL'] ?? 'http://localhost:3000'}/auth/account`,
      {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      },
    );
    if (!response.ok) {
      return { ok: false, message: 'Não foi possível carregar seus dados. Atualize a página.' };
    }
    const account = (await response.json()) as Account;
    return { ok: true, account, passwordChanged: false };
  } catch {
    return { ok: false, message: 'Não foi possível conectar. Tente novamente.' };
  }
}

export async function updateAccountSettings(body: {
  name?: string;
  email?: string;
  current_password?: string;
  new_password?: string;
}): Promise<AccountResult> {
  const cookieStore = cookies();
  const token = cookieStore.get('access_token')?.value;
  if (!token) return { ok: false, message: 'Sua sessão expirou. Entre novamente.' };

  try {
    const response = await fetch(
      `${process.env['API_URL'] ?? 'http://localhost:3000'}/auth/account`,
      {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        cache: 'no-store',
      },
    );
    if (!response.ok) {
      if (response.status === 400) {
        const data = (await response.json().catch(() => null)) as { errors?: string[] } | null;
        return {
          ok: false,
          message: data?.errors?.join(' ') || 'Confira os campos e tente novamente.',
        };
      }
      const messages: Record<number, string> = {
        401: 'Sua senha atual está incorreta ou sua sessão expirou.',
        409: 'Este e-mail já está cadastrado.',
      };
      return {
        ok: false,
        message: messages[response.status] ?? 'Não foi possível salvar. Tente novamente.',
      };
    }

    const data = (await response.json()) as {
      account: Account;
      access_token?: string;
      refresh_token?: string;
    };
    const passwordChanged = Boolean(data.access_token && data.refresh_token);
    if (passwordChanged) {
      const cookieOpts = {
        httpOnly: true,
        sameSite: 'strict' as const,
        secure: process.env['NODE_ENV'] === 'production',
        path: '/',
      };
      cookieStore.set('access_token', data.access_token!, cookieOpts);
      cookieStore.set('refresh_token', data.refresh_token!, cookieOpts);
    }
    return { ok: true, account: data.account, passwordChanged };
  } catch {
    return { ok: false, message: 'Não foi possível conectar. Tente novamente.' };
  }
}
