'use server';

import { apiFetch } from '../../../lib/api';

export type PaidPlanCode = 'SOLO' | 'MAIS' | 'EQUIPE';
export type CycleCode = 'MONTHLY' | 'YEARLY';
export type MethodCode = 'PIX' | 'CREDIT_CARD';

export interface CheckoutPix {
  qrCode: string;
  qrCodeBase64?: string;
  ticketUrl?: string;
}

export type CheckoutResult =
  | { ok: true; checkoutUrl: string | null; pix: CheckoutPix | null }
  | { ok: false; message: string };

export type CancelResult = { ok: true } | { ok: false; message: string };

export interface PendingPix {
  qrCode: string;
  qrCodeBase64: string | null;
  ticketUrl: string | null;
  expiresAt: string | null;
  amount: string;
}

export async function getPendingPix(): Promise<PendingPix | null> {
  try {
    return await apiFetch<PendingPix | null>('/billing/pending-pix');
  } catch {
    return null;
  }
}

const PLANS: readonly string[] = ['SOLO', 'MAIS', 'EQUIPE'];
const CYCLES: readonly string[] = ['MONTHLY', 'YEARLY'];
const METHODS: readonly string[] = ['PIX', 'CREDIT_CARD'];

function failureMessage(err: unknown, fallback: string): string {
  const text = (err as { message?: string } | null)?.message ?? '';
  if (text.endsWith(' 401')) return 'Sua sessão expirou. Entre novamente.';
  if (text.endsWith(' 403')) return 'Apenas administradores da empresa podem alterar a assinatura.';
  return fallback;
}

/**
 * Contrata (ou troca para) um plano pago. O backend espera o código do plano
 * SEM sufixo de ciclo e o ciclo separado em billing_cycle.
 */
export async function startCheckout(input: {
  plan: PaidPlanCode;
  cycle: CycleCode;
  method: MethodCode;
}): Promise<CheckoutResult> {
  if (
    !PLANS.includes(input.plan) ||
    !CYCLES.includes(input.cycle) ||
    !METHODS.includes(input.method)
  ) {
    return { ok: false, message: 'Plano ou forma de pagamento inválidos.' };
  }
  try {
    const res = await apiFetch<{ checkout_url: string | null; pix: CheckoutPix | null }>(
      '/billing/checkout',
      {
        method: 'POST',
        body: JSON.stringify({
          plan_code: input.plan,
          billing_cycle: input.cycle,
          payment_method: input.method,
        }),
      },
    );
    return { ok: true, checkoutUrl: res.checkout_url ?? null, pix: res.pix ?? null };
  } catch (err) {
    return {
      ok: false,
      message: failureMessage(err, 'Não foi possível iniciar o pagamento. Tente novamente.'),
    };
  }
}

export async function cancelSubscription(): Promise<CancelResult> {
  try {
    await apiFetch<unknown>('/billing/cancel', { method: 'POST' });
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      message: failureMessage(err, 'Não foi possível cancelar agora. Tente novamente.'),
    };
  }
}
