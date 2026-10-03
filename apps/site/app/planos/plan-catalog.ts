import {
  PLAN_LIMITS,
  PLAN_PRICING,
  type PlanLimitCode,
  type PlanLimitValues,
} from '@orcivo/shared-types';

export type BillingCycle = 'yearly' | 'monthly';

const presentation = {
  LIVRE: { name: 'Orcivo Livre', support: 'Suporte por e-mail' },
  SOLO: { name: 'Orcivo Solo', support: 'Suporte prioritário' },
  MAIS: { name: 'Orcivo Mais', support: 'Suporte prioritário' },
  EQUIPE: { name: 'Orcivo Equipe', support: 'Suporte VIP' },
} satisfies Record<PlanLimitCode, { name: string; support: string }>;

const currency = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});
const quantity = new Intl.NumberFormat('pt-BR');

function featuresFor(limits: PlanLimitValues): string[] {
  return [
    limits.customers_max === null
      ? 'Clientes em uso justo'
      : `${quantity.format(limits.customers_max)} clientes`,
    limits.quotes_per_month === null
      ? 'Orçamentos em uso justo'
      : `${quantity.format(limits.quotes_per_month)} orçamentos/mês`,
    limits.work_orders_per_month === null
      ? 'OS em uso justo'
      : `${quantity.format(limits.work_orders_per_month)} OS/mês`,
    limits.members_max === 1
      ? `${limits.members_max} membro na equipe`
      : `Até ${quantity.format(limits.members_max)} membros na equipe`,
    limits.pdf_watermark ? "PDF com marca d'água" : "PDF sem marca d'água",
    ...(limits.has_logo ? ['Logo própria no PDF'] : []),
    ...(limits.has_reports ? ['Relatórios financeiros'] : []),
    ...(limits.has_contracts ? ['Contratos digitais'] : []),
  ];
}

export function getPlans() {
  return (Object.keys(PLAN_LIMITS) as PlanLimitCode[]).map((code) => ({
    code,
    name: presentation[code].name,
    features: [...featuresFor(PLAN_LIMITS[code]), presentation[code].support],
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
