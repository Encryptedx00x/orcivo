'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import type { QuoteAction, QuoteUpdateDto } from '@orcivo/shared-types';
import type { Quote } from '../../../lib/quote.service';

/**
 * Ações de domínio do orçamento (PB1-P35 / ADR-016): transições explícitas,
 * com motivo obrigatório em recusar/cancelar/reabrir/corrigir. Os botões da
 * página de detalhe derivam de `allowed_actions` (calculado pelo backend por
 * estado + papel), garantindo que a UI só oferece o que a máquina de estados
 * permite (AC2) — o backend continua sendo a autoridade final (AC2/AC5).
 */

const API_URL = process.env['API_URL'] ?? 'http://localhost:3000';

/** Ações de domínio expostas via override direto (fora do assistente guiado). */
export type DirectQuoteAction = Extract<
  QuoteAction,
  'cancelar' | 'recusar' | 'reabrir' | 'corrigir'
>;

const ACTION_ROUTES: Record<DirectQuoteAction, string> = {
  cancelar: 'cancel',
  recusar: 'reject',
  reabrir: 'reopen',
  corrigir: 'correct',
};

export type QuoteWithActions = Quote & { allowed_actions?: QuoteAction[] };

export interface QuoteActionInput {
  action: DirectQuoteAction;
  /** Obrigatório para todas as ações diretas (validado também no backend). */
  reason?: string;
}

export type QuoteActionResult = { error?: string; quote?: QuoteWithActions };

function authToken(): string | null {
  return cookies().get('access_token')?.value ?? null;
}

export async function quoteAction(id: string, input: QuoteActionInput): Promise<QuoteActionResult> {
  const route = ACTION_ROUTES[input.action];
  if (!route) return { error: `Ação inválida: ${input.action}` };

  const token = authToken();
  if (!token) return { error: 'Sessão expirada. Faça login novamente.' };

  let res: Response;
  try {
    res = await fetch(`${API_URL}/quotes/${id}/${route}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ reason: input.reason }),
      cache: 'no-store',
    });
  } catch {
    return { error: 'Não foi possível contatar o servidor. Tente novamente.' };
  }

  if (!res.ok) {
    const errBody = (await res.json().catch(() => null)) as { message?: string } | null;
    return { error: errBody?.message ?? `Erro ao executar a ação (${res.status}).` };
  }

  revalidatePath('/orcamentos');
  revalidatePath(`/orcamentos/${id}`);
  const quote = (await res.json()) as QuoteWithActions;
  return { quote };
}

/** PB1-P35/AC1: edição direta dos campos do orçamento fora do assistente guiado. */
export async function updateQuote(
  id: string,
  dto: Partial<QuoteUpdateDto>,
): Promise<QuoteActionResult> {
  const token = authToken();
  if (!token) return { error: 'Sessão expirada. Faça login novamente.' };

  let res: Response;
  try {
    res = await fetch(`${API_URL}/quotes/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(dto),
      cache: 'no-store',
    });
  } catch {
    return { error: 'Não foi possível contatar o servidor. Tente novamente.' };
  }

  if (!res.ok) {
    const errBody = (await res.json().catch(() => null)) as { message?: string } | null;
    return { error: errBody?.message ?? `Erro ao salvar as alterações (${res.status}).` };
  }

  revalidatePath('/orcamentos');
  revalidatePath(`/orcamentos/${id}`);
  const quote = (await res.json()) as QuoteWithActions;
  return { quote };
}
