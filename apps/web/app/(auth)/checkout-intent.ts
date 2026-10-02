// Intenção de contratar vinda do site (?plan=X&cycle=Y). /login e /signup a
// propagam entre si e, depois de autenticar, levam o usuário ao checkout
// dentro do app.

export const PAID_PLANS = ['SOLO', 'MAIS', 'EQUIPE'] as const;
export const BILLING_CYCLES = ['MONTHLY', 'YEARLY'] as const;

export type PaidPlan = (typeof PAID_PLANS)[number];
export type BillingCycle = (typeof BILLING_CYCLES)[number];

export interface CheckoutIntent {
  plan: PaidPlan;
  cycle: BillingCycle;
}

type ParamReader = { get(name: string): string | null };

/** Lê plan/cycle da query string; null se não houver plano pago válido. */
export function readCheckoutIntent(params: ParamReader | null | undefined): CheckoutIntent | null {
  const plan = params?.get('plan')?.toUpperCase();
  if (!plan || !(PAID_PLANS as readonly string[]).includes(plan)) return null;
  const rawCycle = params?.get('cycle')?.toUpperCase();
  const cycle: BillingCycle = rawCycle === 'MONTHLY' ? 'MONTHLY' : 'YEARLY';
  return { plan: plan as PaidPlan, cycle };
}

/** Query string a anexar a links entre /login e /signup ('' sem intenção). */
export function intentQuery(intent: CheckoutIntent | null): string {
  return intent ? `?plan=${intent.plan}&cycle=${intent.cycle}` : '';
}

/** Para onde ir depois de autenticar: checkout no app, ou o destino padrão. */
export function postAuthPath(intent: CheckoutIntent | null, fallback = '/dashboard'): string {
  return intent ? `/plano/checkout${intentQuery(intent)}` : fallback;
}
