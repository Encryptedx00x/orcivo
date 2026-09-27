'use server';

import { cookies } from 'next/headers';

type Result = { ok: true } | { ok: false; message: string };

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
