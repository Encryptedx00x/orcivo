import { PLAN_LIMITS, PLAN_PRICING } from './plans';

describe('PLAN_LIMITS (ownerDecisions.PRICING)', () => {
  it('LIVRE: 5 clientes / 10 orcamentos / 15 OS', () => {
    expect(PLAN_LIMITS.LIVRE).toEqual({
      customers_max: 5,
      quotes_per_month: 10,
      work_orders_per_month: 15,
      members_max: 1,
      has_logo: false,
      pdf_watermark: true,
      has_reports: false,
      has_contracts: false,
    });
  });

  it('SOLO: 50 clientes / 50 orcamentos / 30 OS', () => {
    expect(PLAN_LIMITS.SOLO).toEqual({
      customers_max: 50,
      quotes_per_month: 50,
      work_orders_per_month: 30,
      members_max: 1,
      has_logo: true,
      pdf_watermark: false,
      has_reports: false,
      has_contracts: false,
    });
  });

  it('MAIS: 200 clientes, orcamentos/OS ilimitados', () => {
    expect(PLAN_LIMITS.MAIS).toEqual({
      customers_max: 200,
      quotes_per_month: null,
      work_orders_per_month: null,
      members_max: 3,
      has_logo: true,
      pdf_watermark: false,
      has_reports: true,
      has_contracts: false,
    });
  });

  it('EQUIPE: 8 usuarios, tudo ilimitado, contratos', () => {
    expect(PLAN_LIMITS.EQUIPE).toEqual({
      customers_max: null,
      quotes_per_month: null,
      work_orders_per_month: null,
      members_max: 8,
      has_logo: true,
      pdf_watermark: false,
      has_reports: true,
      has_contracts: true,
    });
  });
});

describe('PLAN_PRICING (ownerDecisions.PRICING)', () => {
  it('tem os precos exatos como string decimal', () => {
    expect(PLAN_PRICING).toEqual({
      LIVRE: { monthly: '0.00', yearly: '0.00' },
      SOLO: { monthly: '9.90', yearly: '79.90' },
      MAIS: { monthly: '24.90', yearly: '199.90' },
      EQUIPE: { monthly: '49.90', yearly: '389.90' },
    });
  });

  it('nunca usa number para dinheiro', () => {
    for (const p of Object.values(PLAN_PRICING)) {
      expect(typeof p.monthly).toBe('string');
      expect(typeof p.yearly).toBe('string');
    }
  });
});
