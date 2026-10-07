'use server';

import { revalidatePath } from 'next/cache';
import type { ExpenseCreateDto } from '@orcivo/shared-types';
import { apiFetch } from '../../../lib/api';

type Result = { ok: true } | { ok: false; message: string };

const fail = (e: unknown, fallback: string): Result => ({
  ok: false,
  message: (e as { serverMessage?: string })?.serverMessage ?? fallback,
});

export async function createExpense(dto: ExpenseCreateDto): Promise<Result> {
  try {
    await apiFetch('/expenses', { method: 'POST', body: JSON.stringify(dto) });
    revalidatePath('/financeiro');
    return { ok: true };
  } catch (e) {
    return fail(e, 'Não foi possível lançar o custo.');
  }
}

export async function payExpense(id: string): Promise<Result> {
  try {
    await apiFetch(`/expenses/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'PAID' }),
    });
    revalidatePath('/financeiro');
    return { ok: true };
  } catch (e) {
    return fail(e, 'Não foi possível marcar como pago.');
  }
}

export async function deleteExpense(id: string): Promise<Result> {
  try {
    await apiFetch(`/expenses/${encodeURIComponent(id)}`, { method: 'DELETE' });
    revalidatePath('/financeiro');
    return { ok: true };
  } catch (e) {
    return fail(e, 'Não foi possível excluir o custo.');
  }
}
