import { PLAN_PRESENTATION, PLAN_PRICING, formatMoney, planFeatures } from '@orcivo/shared-types';

export interface PlanMeta {
  code: 'LIVRE' | 'SOLO' | 'MAIS' | 'EQUIPE';
  name: string;
  tag: string | null;
  features: string[];
}

const TAGS: Record<PlanMeta['code'], string | null> = {
  LIVRE: null,
  SOLO: null,
  MAIS: 'Recomendado',
  EQUIPE: 'Para escala',
};

export const PLANS: PlanMeta[] = (['LIVRE', 'SOLO', 'MAIS', 'EQUIPE'] as const).map((code) => ({
  code,
  name: PLAN_PRESENTATION[code].name,
  tag: TAGS[code],
  features: planFeatures(code),
}));

export function findPlan(code: string | null | undefined): PlanMeta | undefined {
  return PLANS.find((p) => p.code === code);
}

export function priceLabel(code: PlanMeta['code'], cycle: 'MONTHLY' | 'YEARLY'): string {
  const value = PLAN_PRICING[code][cycle === 'YEARLY' ? 'yearly' : 'monthly'];
  return `${formatMoney(value)}${cycle === 'YEARLY' ? '/ano' : '/mês'}`;
}
