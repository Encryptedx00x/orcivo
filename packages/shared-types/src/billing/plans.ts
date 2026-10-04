// Fonte unica de verdade de limites e precos dos planos Orcivo.
// Valores decididos em ownerDecisions.PRICING (MVP-LAUNCH-BATCH-2.tasks.json).
// REGRA: sem @prisma/client, @nestjs/*, react ou react-native. Dinheiro sempre string decimal.

export type PlanLimitCode = 'LIVRE' | 'SOLO' | 'MAIS' | 'EQUIPE';

export interface PlanLimitValues {
  /** null = ilimitado */
  customers_max: number | null;
  quotes_per_month: number | null;
  work_orders_per_month: number | null;
  members_max: number;
  has_logo: boolean;
  pdf_watermark: boolean;
  has_reports: boolean;
  has_contracts: boolean;
}

export interface PlanPricingValues {
  /** string decimal, ex.: "24.90" */
  monthly: string;
  yearly: string;
}

export const PLAN_LIMITS = {
  LIVRE: {
    customers_max: 5,
    quotes_per_month: 10,
    work_orders_per_month: 15,
    members_max: 1,
    has_logo: false,
    pdf_watermark: true,
    has_reports: false,
    has_contracts: false,
  },
  SOLO: {
    customers_max: 50,
    quotes_per_month: 50,
    work_orders_per_month: 30,
    members_max: 1,
    has_logo: true,
    pdf_watermark: false,
    has_reports: false,
    has_contracts: false,
  },
  MAIS: {
    customers_max: 200,
    quotes_per_month: null,
    work_orders_per_month: null,
    members_max: 3,
    has_logo: true,
    pdf_watermark: false,
    has_reports: true,
    has_contracts: false,
  },
  EQUIPE: {
    customers_max: null,
    quotes_per_month: null,
    work_orders_per_month: null,
    members_max: 8,
    has_logo: true,
    pdf_watermark: false,
    has_reports: true,
    has_contracts: true,
  },
} as const satisfies Record<PlanLimitCode, PlanLimitValues>;

export const PLAN_PRICING = {
  LIVRE: { monthly: '0.00', yearly: '0.00' },
  SOLO: { monthly: '9.90', yearly: '79.90' },
  MAIS: { monthly: '24.90', yearly: '199.90' },
  EQUIPE: { monthly: '49.90', yearly: '389.90' },
} as const satisfies Record<PlanLimitCode, PlanPricingValues>;

export const PLAN_PRESENTATION = {
  LIVRE: { name: 'Orcivo Livre', support: 'Suporte por e-mail' },
  SOLO: { name: 'Orcivo Solo', support: 'Suporte prioritário' },
  MAIS: { name: 'Orcivo Mais', support: 'Suporte prioritário' },
  EQUIPE: { name: 'Orcivo Equipe', support: 'Suporte VIP' },
} as const satisfies Record<PlanLimitCode, { name: string; support: string }>;

const quantity = new Intl.NumberFormat('pt-BR');

/** Lista de recursos exibida em site, web e mobile — derivada de PLAN_LIMITS. */
export function planFeatures(code: PlanLimitCode): string[] {
  const limits: PlanLimitValues = PLAN_LIMITS[code];
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
      ? '1 membro na equipe'
      : `Até ${quantity.format(limits.members_max)} membros na equipe`,
    limits.pdf_watermark ? "PDF com marca d'água" : "PDF sem marca d'água",
    ...(limits.has_logo ? ['Logo própria no PDF'] : []),
    ...(limits.has_reports ? ['Relatórios financeiros'] : []),
    ...(limits.has_contracts ? ['Contratos digitais'] : []),
    PLAN_PRESENTATION[code].support,
  ];
}
