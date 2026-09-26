'use server';

import { cookies } from 'next/headers';

type Result = { ok: true } | { ok: false; message: string };

async function mutate(
  id: string,
  method: 'PATCH' | 'DELETE',
  body?: Record<string, unknown>,
): Promise<Result> {
  const token = cookies().get('access_token')?.value;
  if (!token) return { ok: false, message: 'Sua sessão expirou. Entre novamente.' };
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return { ok: false, message: 'Compromisso inválido.' };
  }
  try {
    const response = await fetch(
      `${process.env['API_URL'] ?? 'http://localhost:3000'}/appointments/${id}`,
      {
        method,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
        cache: 'no-store',
      },
    );
    if (!response.ok) {
      const messages: Record<number, string> = {
        400: 'Confira os campos e o intervalo de início e fim.',
        401: 'Sua sessão expirou. Entre novamente.',
        403: 'Você não tem permissão para alterar este compromisso.',
        404: 'Compromisso ou cliente não encontrado. Atualize a agenda.',
        409: 'Compromisso alterado. Atualize a agenda e tente novamente.',
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

export async function updateAppointment(
  id: string,
  body: Record<string, unknown>,
): Promise<Result> {
  return mutate(id, 'PATCH', body);
}

export async function deleteAppointment(id: string): Promise<Result> {
  return mutate(id, 'DELETE');
}
