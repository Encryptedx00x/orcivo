import { PLAN_PRICING, formatMoney } from '@orcivo/shared-types';

export interface PlanMeta {
  code: keyof typeof PLAN_PRICING;
  name: string;
  price: string;
  period: string;
}

const PLAN_NAMES: Record<PlanMeta['code'], string> = {
  LIVRE: 'Orcivo Livre',
  SOLO: 'Orcivo Solo',
  MAIS: 'Orcivo Mais',
  EQUIPE: 'Orcivo Equipe',
};

export const PLANS: PlanMeta[] = (Object.keys(PLAN_NAMES) as PlanMeta['code'][]).map((code) => ({
  code,
  name: PLAN_NAMES[code],
  price: formatMoney(PLAN_PRICING[code].monthly),
  period: code === 'LIVRE' ? '' : '/mês',
}));

export function planName(code: string): string {
  return PLANS.find((p) => p.code === code)?.name ?? code;
}
