// Nomenclatura e preços espelham apps/web/app/(app)/plano/page.tsx — ver CLAUDE.md "Nomenclatura de planos".
export interface PlanMeta {
  code: string;
  name: string;
  price: string;
  period: string;
}

export const PLANS: PlanMeta[] = [
  { code: 'LIVRE', name: 'Orcivo Livre', price: 'R$ 0', period: '' },
  { code: 'SOLO', name: 'Orcivo Solo', price: 'R$ 9,90', period: '/mês' },
  { code: 'MAIS', name: 'Orcivo Mais', price: 'R$ 19,90', period: '/mês' },
  { code: 'EQUIPE', name: 'Orcivo Equipe', price: 'R$ 39,90', period: '/mês' },
];

export function planName(code: string): string {
  return PLANS.find((p) => p.code === code)?.name ?? code;
}
