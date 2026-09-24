import { ForbiddenException } from '@nestjs/common';
import { PlanLimitsService } from './plan-limits.service';

const mockPrisma = {
  company: { findUniqueOrThrow: jest.fn() },
  planLimit: { findUnique: jest.fn() },
  workOrder: { count: jest.fn() },
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
});
