import { ForbiddenException } from '@nestjs/common';
import { PlanLimitsService } from './plan-limits.service';

const mockPrisma = {
  company: { findUniqueOrThrow: jest.fn() },
  planLimit: { findUnique: jest.fn() },
  customer: { count: jest.fn() },
  quote: { count: jest.fn() },
  workOrder: { count: jest.fn() },
  companyMember: { count: jest.fn() },
};

const livreCompany = { id: 'c1', plan_code: 'LIVRE', subscription: null };

const livreLimits = {
  plan_code: 'LIVRE',
  customers_max: 5,
  quotes_per_month: 10,
  work_orders_per_month: 15,
  members_max: 1,
  has_logo: false,
  pdf_watermark: true,
  has_reports: false,
  has_contracts: false,
};

describe('PlanLimitsService', () => {
  let service: PlanLimitsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PlanLimitsService(mockPrisma as never);
  });

  it('getUsage calcula snapshot tenant-scoped, período mensal e restante', async () => {
    const now = new Date('2026-10-15T12:00:00.000Z');
    mockPrisma.company.findUniqueOrThrow.mockResolvedValue(livreCompany);
    mockPrisma.planLimit.findUnique.mockResolvedValue(livreLimits);
    mockPrisma.customer.count.mockResolvedValue(4);
    mockPrisma.quote.count.mockResolvedValue(8);
    mockPrisma.workOrder.count.mockResolvedValue(15);
    mockPrisma.companyMember.count.mockResolvedValue(1);

    const result = await service.getUsage('c1', now);

    expect(result.plan).toMatchObject({ code: 'LIVRE', name: 'Orcivo Livre', is_blocked: false });
    expect(result.resources).toEqual([
      expect.objectContaining({ code: 'CUSTOMERS', used: 4, limit: 5, remaining: 1 }),
      expect.objectContaining({
        code: 'QUOTES_MONTH',
        used: 8,
        limit: 10,
        state: 'ATTENTION',
      }),
      expect.objectContaining({
        code: 'WORK_ORDERS_MONTH',
        used: 15,
        limit: 15,
        remaining: 0,
        state: 'REACHED',
      }),
      expect.objectContaining({ code: 'MEMBERS', used: 1, limit: 1, state: 'REACHED' }),
    ]);
    expect(new Date(result.usage_period.start).getDate()).toBe(1);
    expect(new Date(result.usage_period.reset_at).getMonth()).toBe(10);
    expect(result.generated_at).toBe(now.toISOString());
    expect(mockPrisma.customer.count).toHaveBeenCalledWith({
      where: { company_id: 'c1', deleted_at: null },
    });
    expect(mockPrisma.companyMember.count).toHaveBeenCalledWith({
      where: { company_id: 'c1', active: true },
    });
    expect(mockPrisma.quote.count).toHaveBeenCalledWith({
      where: {
        company_id: 'c1',
        created_at: { gte: expect.any(Date), lt: expect.any(Date) },
      },
    });
  });

  it('getUsage representa uso justo e contador indisponível sem inventar zero', async () => {
    mockPrisma.company.findUniqueOrThrow.mockResolvedValue({
      id: 'company-b',
      plan_code: 'MAIS',
      subscription: {
        status: 'ACTIVE',
        current_period_start: new Date('2026-10-05T00:00:00.000Z'),
        current_period_end: new Date('2026-11-05T00:00:00.000Z'),
      },
    });
    mockPrisma.planLimit.findUnique.mockResolvedValue({
      ...livreLimits,
      plan_code: 'MAIS',
      customers_max: 200,
      quotes_per_month: null,
      work_orders_per_month: null,
      members_max: 3,
      has_logo: true,
      pdf_watermark: false,
      has_reports: true,
    });
    mockPrisma.customer.count.mockRejectedValueOnce(new Error('contador indisponível'));
    mockPrisma.quote.count.mockResolvedValue(27);
    mockPrisma.workOrder.count.mockResolvedValue(12);
    mockPrisma.companyMember.count.mockResolvedValue(2);

    const result = await service.getUsage('company-b', new Date('2026-10-15T12:00:00.000Z'));

    expect(result.resources[0]).toMatchObject({
      code: 'CUSTOMERS',
      used: null,
      remaining: null,
      state: 'UNAVAILABLE',
    });
    expect(result.resources[1]).toMatchObject({
      code: 'QUOTES_MONTH',
      used: 27,
      limit: null,
      remaining: null,
      state: 'FAIR_USE',
    });
    expect(result.billing_period?.renews_at).toBe('2026-11-05T00:00:00.000Z');
    expect(result.features).toContainEqual({
      code: 'REPORTS',
      label: 'Relatórios financeiros',
      state: 'AVAILABLE',
    });
  });

  it('getLimits retorna 15 OS/mês para plano LIVRE (baseline P-16)', async () => {
    mockPrisma.company.findUniqueOrThrow.mockResolvedValue(livreCompany);
    mockPrisma.planLimit.findUnique.mockResolvedValue(livreLimits);

    const result = await service.getLimits('c1');

    expect(result.plan_code).toBe('LIVRE');
    expect(result.work_orders_per_month).toBe(15);
    expect(mockPrisma.planLimit.findUnique).toHaveBeenCalledWith({
      where: { plan_code: 'LIVRE' },
    });
  });

  it('getLimits usa default de 15 OS/mês quando PlanLimit não existe (seed não rodou)', async () => {
    mockPrisma.company.findUniqueOrThrow.mockResolvedValue(livreCompany);
    mockPrisma.planLimit.findUnique.mockResolvedValue(null);

    const result = await service.getLimits('c1');

    expect(result.plan_code).toBe('LIVRE');
    expect(result.work_orders_per_month).toBe(15);
  });

  it('enforceLimit WORK_ORDERS_MONTH permite a 15ª OS do mês', async () => {
    mockPrisma.company.findUniqueOrThrow.mockResolvedValue(livreCompany);
    mockPrisma.planLimit.findUnique.mockResolvedValue(livreLimits);
    mockPrisma.workOrder.count.mockResolvedValue(14);

    await expect(service.enforceLimit('c1', 'WORK_ORDERS_MONTH')).resolves.toBeUndefined();
  });

  it('enforceLimit WORK_ORDERS_MONTH bloqueia após 15 OS com paywall citando o limite 15', async () => {
    mockPrisma.company.findUniqueOrThrow.mockResolvedValue(livreCompany);
    mockPrisma.planLimit.findUnique.mockResolvedValue(livreLimits);
    mockPrisma.workOrder.count.mockResolvedValue(15);

    await expect(service.enforceLimit('c1', 'WORK_ORDERS_MONTH')).rejects.toThrow(
      ForbiddenException,
    );
    await expect(service.enforceLimit('c1', 'WORK_ORDERS_MONTH')).rejects.toThrow(
      /Limite de 15 OS\/mês atingido/,
    );
  });

  it('enforceReports bloqueia Orcivo Livre e permite Orcivo Mais', async () => {
    mockPrisma.company.findUniqueOrThrow.mockResolvedValue(livreCompany);
    mockPrisma.planLimit.findUnique.mockResolvedValue(livreLimits);
    await expect(service.enforceReports('c1')).rejects.toThrow(ForbiddenException);

    mockPrisma.company.findUniqueOrThrow.mockResolvedValue({ ...livreCompany, plan_code: 'MAIS' });
    mockPrisma.planLimit.findUnique.mockResolvedValue({
      ...livreLimits,
      plan_code: 'MAIS',
      has_reports: true,
    });
    await expect(service.enforceReports('c1')).resolves.toBeUndefined();
  });
});
