/**
 * work-order.service.ts
 *
 * Funções de acesso à API de Ordens de Serviço.
 *
 * IMPORTANTE — dois contextos de execução:
 *
 * 1. SERVER (Server Components, Server Actions, Route Handlers):
 *    Usa apiFetch() que lê o token JWT do cookie httpOnly via next/headers.
 *    Funções: fetchAll, fetchOne, updateStatus.
 *
 * 2. CLIENT (Client Components — browser):
 *    uploadPhoto: chama a Route Handler /api/work-orders/:id/photos que faz proxy
 *    para o backend. O cookie httpOnly é enviado automaticamente pelo browser em
 *    requisições same-origin — NÃO usa a opção credentials=include do fetch
 *    (isso é para cookies de sessão cross-origin, não é o padrão deste projeto).
 *    NÃO usa Authorization: Bearer direto — o token está em httpOnly cookie.
 */

import { apiFetch } from './api';

export interface WorkOrderPhoto {
  id: string;
  photo_stage: 'BEFORE' | 'DURING' | 'AFTER';
  file_url: string;
  caption?: string;
}

export interface WorkOrder {
  id: string;
  number: number;
  title: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED';
  customer: { id: string; name: string };
  technician?: { id: string; name: string } | null;
  scheduled_at?: string;
  started_at?: string;
  finished_at?: string;
  total?: string | null;
  photos: WorkOrderPhoto[];
  quote?: { id: string; number: number };
}

/** SERVER-ONLY: lista OS com paginação. */
export const fetchAllWorkOrders = (page = 1) =>
  apiFetch<{ data: WorkOrder[]; total: number; page: number }>(`/work-orders?page=${page}`);

/** SERVER-ONLY: busca uma OS pelo ID. */
export const fetchOneWorkOrder = (id: string) => apiFetch<WorkOrder>(`/work-orders/${id}`);

/** SERVER-ONLY: atualiza status (usado em Server Actions). */
export const updateWorkOrderStatus = (id: string, status: string) =>
  apiFetch<WorkOrder>(`/work-orders/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });

/**
 * CLIENT-SAFE: upload de foto via Route Handler Next.js.
 * Chama /api/work-orders/:id/photos que injeta o cabeçalho de auth a partir do cookie httpOnly.
 * Sem a opção credentials=include — same-origin, cookie é enviado automaticamente.
 */
export async function uploadWorkOrderPhoto(
  workOrderId: string,
  file: File,
  stage: 'BEFORE' | 'DURING' | 'AFTER',
  caption?: string,
): Promise<WorkOrderPhoto> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('stage', stage);
  if (caption) formData.append('caption', caption);

  const res = await fetch(`/api/work-orders/${workOrderId}/photos`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Upload falhou (${res.status})`);
  }

  return res.json() as Promise<WorkOrderPhoto>;
}
