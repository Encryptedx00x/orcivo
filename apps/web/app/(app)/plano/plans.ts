import { PLAN_PRICING, formatMoney } from '@orcivo/shared-types';

export interface PlanMeta {
  code: 'LIVRE' | 'SOLO' | 'MAIS' | 'EQUIPE';
  name: string;
  tag: string | null;
  features: string[];
}

export const PLANS: PlanMeta[] = [
  {
    code: 'LIVRE',
    name: 'Orcivo Livre',
    tag: null,
    features: ['1 usuário', 'Até 15 OS / mês', 'PDF com marca Orcivo', 'Suporte por e-mail'],
  },
  {
    code: 'SOLO',
    name: 'Orcivo Solo',
    tag: null,
    features: ['3 usuários', 'OS em uso justo', 'Seu logo no PDF', 'Chave Pix'],
  },
  {
    code: 'MAIS',
    name: 'Orcivo Mais',
    tag: 'Recomendado',
    features: [
      'Até 10 usuários',
      'Tudo do Orcivo Solo',
      'Catálogo avançado',
      'Relatórios',
      'Suporte prioritário',
    ],
  },
  {
    code: 'EQUIPE',
    name: 'Orcivo Equipe',
    tag: 'Para escala',
    features: ['Uso ampliado', 'Tudo do Orcivo Mais', 'Multi-empresa', 'Suporte dedicado'],
  },
];

export function findPlan(code: string | null | undefined): PlanMeta | undefined {
  return PLANS.find((p) => p.code === code);
}

export function priceLabel(code: PlanMeta['code'], cycle: 'MONTHLY' | 'YEARLY'): string {
  const value = PLAN_PRICING[code][cycle === 'YEARLY' ? 'yearly' : 'monthly'];
  return `${formatMoney(value)}${cycle === 'YEARLY' ? '/ano' : '/mês'}`;
}
