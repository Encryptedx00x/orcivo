'use server';

import { revalidatePath } from 'next/cache';
import { updateWorkOrderStatus } from '../../../lib/work-order.service';

export async function updateStatusAction(id: string, status: string): Promise<{ error?: string }> {
  try {
    await updateWorkOrderStatus(id, status);
    revalidatePath('/ordens-de-servico');
    revalidatePath(`/ordens-de-servico/${id}`);
    return {};
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'Erro ao atualizar status.' };
  }
}
