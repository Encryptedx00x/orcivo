'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import type { WorkOrderAction, WorkOrderStatus } from '@orcivo/shared-types';
import type { WorkOrder } from '../../../lib/work-order.service';

export type { WorkOrderAction } from '@orcivo/shared-types';

/**
 * Ações de domínio da OS (P-01 / ADR-016 / R5b): transições explícitas com motivo
 * obrigatório em cancelar/reabrir/corrigir. Os botões da página de detalhe
 * derivam de `allowed_actions` (calculado pelo backend por estado + papel +
 * status extras da empresa), garantindo que a UI só oferece o que a máquina
 * de estados permite (AC4). Tipos e transições vêm do shared-types — nada é
 * duplicado aqui.
 */

const API_URL = process.env['API_URL'] ?? 'http://localhost:3000';

/** Ação de domínio → rota do backend. */
const ACTION_ROUTES: Record<WorkOrderAction, string> = {
  iniciar: 'start',
  concluir: 'complete',
  cancelar: 'cancel',
  reabrir: 'reopen',
  corrigir: 'correct',
  aguardar_pagamento: 'await-payment',
  receber_pagamento: 'receive-payment',
  acionar_garantia: 'claim-warranty',
};

export type WorkOrderWithActions = Omit<WorkOrder, 'status'> & {
  status: WorkOrderStatus;
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
  /** A seleção manual usa a mesma máquina de ações no backend. */
  status?: WorkOrderStatus;
}

export type WorkOrderActionResult = { error?: string; order?: WorkOrderWithActions };

export async function workOrderAction(
  id: string,
  input: WorkOrderActionInput,
): Promise<WorkOrderActionResult> {
  const route = input.status ? 'status' : ACTION_ROUTES[input.action];
  if (!route) return { error: `Ação inválida: ${input.action}` };

  const cookieStore = await cookies();
  const token = cookieStore.get('access_token')?.value;
  if (!token) return { error: 'Sessão expirada. Faça login novamente.' };

  const body: Record<string, string> = {};
  if (input.status !== undefined) body['status'] = input.status;
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

/** Segment fields (marca, modelo, nº de série…) of an open OS. */
export async function saveWorkOrderDetails(
  id: string,
  details: Record<string, string>,
): Promise<{ error?: string }> {
  const token = (await cookies()).get('access_token')?.value;
  if (!token) return { error: 'Sessão expirada. Faça login novamente.' };
  try {
    const res = await fetch(`${API_URL}/work-orders/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ details }),
      cache: 'no-store',
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { message?: string } | null;
      return { error: body?.message ?? 'Não foi possível salvar os dados.' };
    }
    revalidatePath(`/ordens-de-servico/${id}`);
    return {};
  } catch {
    return { error: 'Não foi possível contatar o servidor. Tente novamente.' };
  }
}
