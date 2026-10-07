import {
  decimalPercentage,
  formatMoney,
  multiplyDecimal,
  PLAN_LIMITS,
  PLAN_PRESENTATION,
  PLAN_PRICING,
  planFeatures,
  type PlanLimitCode,
} from '@orcivo/shared-types';

export type BillingCycle = 'yearly' | 'monthly';

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
  const price = formatMoney(PLAN_PRICING[code][cycle]);
  if (price === 'R$ 0,00') return 'Grátis';
  return `${price.replace(/\s/g, '')}/${cycle === 'yearly' ? 'ano' : 'mês'}`;
}

// Desconto mínimo entre os planos pagos, sem prometer uma economia maior
// que a disponível. Doze converte o preço mensal em um ano de assinatura.
export function annualDiscount(): number {
  const discounts = Object.values(PLAN_PRICING)
    .filter(({ monthly }) => formatMoney(monthly) !== 'R$ 0,00')
    // Percent only (not money): yearly as a share of twelve monthly payments.
    .map(({ monthly, yearly }) =>
      Math.floor(100 - Number(decimalPercentage(yearly, multiplyDecimal(monthly, '12')))),
    );
  return discounts.length ? Math.max(0, Math.min(...discounts)) : 0;
}
