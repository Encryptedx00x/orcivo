'use server';

import { updateWorkOrderStatus } from '../../../lib/work-order.service';

export async function updateStatusAction(id: string, status: string): Promise<{ error?: string }> {
  try {
    await updateWorkOrderStatus(id, status);
    return {};
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'Erro ao atualizar status.' };
  }
}
