import type { WorkOrderPhoto } from './work-order.service';

/**
 * CLIENT-SAFE: upload de foto de OS via Route Handler Next.js.
 *
 * Não importa api.ts (server-only) nem next/headers.
 * O cookie httpOnly com o JWT é enviado automaticamente pelo browser
 * em requisições same-origin. A Route Handler /api/work-orders/:id/photos
 * lê o cookie e injeta Authorization: Bearer no backend.
 *
 * NÃO usa credentials:'include' — o cookie já é enviado por ser same-origin.
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
