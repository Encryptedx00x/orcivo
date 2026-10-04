import {
  PLAN_LIMITS,
  PLAN_PRESENTATION,
  PLAN_PRICING,
  planFeatures,
  type PlanLimitCode,
} from '@orcivo/shared-types';

export type BillingCycle = 'yearly' | 'monthly';

const currency = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

export function getPlans() {
  return (Object.keys(PLAN_LIMITS) as PlanLimitCode[]).map((code) => ({
    code,
    name: PLAN_PRESENTATION[code].name,
    features: planFeatures(code),
    highlight: code === 'MAIS',
    cta: code === 'LIVRE' ? 'Criar conta grátis' : 'Assinar agora',
  }));
}

export function priceLabel(code: PlanLimitCode, cycle: BillingCycle): string {
  const price = Number(PLAN_PRICING[code][cycle]);
  if (price === 0) return 'Grátis';
  return `${currency.format(price).replace(/\s/g, '')}/${cycle === 'yearly' ? 'ano' : 'mês'}`;
}

// Desconto mínimo entre os planos pagos, sem prometer uma economia maior
// que a disponível. Doze converte o preço mensal em um ano de assinatura.
export function annualDiscount(): number {
  const discounts = Object.values(PLAN_PRICING)
    .filter(({ monthly }) => Number(monthly) > 0)
    .map(({ monthly, yearly }) => Math.floor((1 - Number(yearly) / (Number(monthly) * 12)) * 100));
  return discounts.length ? Math.max(0, Math.min(...discounts)) : 0;
}
