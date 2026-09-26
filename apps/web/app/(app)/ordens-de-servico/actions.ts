'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import type { WorkOrder } from '../../../lib/work-order.service';

/**
 * Ações de domínio da OS (P-01 / ADR-016): transições explícitas com motivo
 * obrigatório em cancelar/reabrir/corrigir. Os botões da página de detalhe
 * derivam de `allowed_actions` (calculado pelo backend por estado + papel),
 * garantindo que a UI só oferece o que a máquina de estados permite (AC4).
 */

const API_URL = process.env['API_URL'] ?? 'http://localhost:3000';

/** Ação de domínio → rota do backend. */
const ACTION_ROUTES: Record<WorkOrderAction, string> = {
  iniciar: 'start',
  concluir: 'complete',
  cancelar: 'cancel',
  reabrir: 'reopen',
  corrigir: 'correct',
};

export type WorkOrderAction = 'iniciar' | 'concluir' | 'cancelar' | 'reabrir' | 'corrigir';

export type WorkOrderWithActions = WorkOrder & {
  customer: WorkOrder['customer'] & { phone?: string | null };
  allowed_actions?: WorkOrderAction[];
  /** Presente na resposta do backend, ausente do tipo legado da lib. */
  notes?: string | null;
};

export interface WorkOrderActionInput {
  action: WorkOrderAction;
  /** Obrigatório para cancelar/reabrir/corrigir (validado também no backend). */
  reason?: string;
  /** Campos operacionais opcionais — apenas para corrigir. */
  title?: string;
  notes?: string;
}

export type WorkOrderActionResult = { error?: string; order?: WorkOrderWithActions };

export async function workOrderAction(
  id: string,
  input: WorkOrderActionInput,
): Promise<WorkOrderActionResult> {
  const route = ACTION_ROUTES[input.action];
  if (!route) return { error: `Ação inválida: ${input.action}` };

  const cookieStore = cookies();
  const token = cookieStore.get('access_token')?.value;
  if (!token) return { error: 'Sessão expirada. Faça login novamente.' };

  const body: Record<string, string> = {};
  if (input.reason !== undefined) body['reason'] = input.reason;
  if (input.title !== undefined) body['title'] = input.title;
  if (input.notes !== undefined) body['notes'] = input.notes;

  let res: Response;
  try {
    res = await fetch(`${API_URL}/work-orders/${id}/${route}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
      cache: 'no-store',
    });
  } catch {
    return { error: 'Não foi possível contatar o servidor. Tente novamente.' };
  }

  if (!res.ok) {
    const errBody = (await res.json().catch(() => null)) as { message?: string } | null;
    return { error: errBody?.message ?? `Erro ao executar a ação (${res.status}).` };
  }

  revalidatePath('/ordens-de-servico');
  revalidatePath(`/ordens-de-servico/${id}`);
  const order = (await res.json()) as WorkOrderWithActions;
  return { order };
}
