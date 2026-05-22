import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { TenantGuard } from './tenant.guard';

const mockPrisma = { companyMember: { findFirst: jest.fn() } };
const mockRedis = { get: jest.fn(), setex: jest.fn(), del: jest.fn() };

function makeContext(userId?: string): ExecutionContext {
  const request: Record<string, unknown> = { user: userId ? { userId } : undefined };
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

describe('TenantGuard', () => {
  let guard: TenantGuard;

  beforeEach(() => {
    jest.clearAllMocks();
    guard = new TenantGuard(mockPrisma as never, mockRedis as never);
  });

  it('AUTH-03: cache hit — injeta companyId sem bater no banco', async () => {
    mockRedis.get.mockResolvedValue('company-abc');
    const ctx = makeContext('user-1');
    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);
    expect(ctx.switchToHttp().getRequest().companyId).toBe('company-abc');
    expect(mockPrisma.companyMember.findFirst).not.toHaveBeenCalled();
  });

  it('AUTH-03: cache miss — busca no banco e faz setex(60)', async () => {
    mockRedis.get.mockResolvedValue(null);
    mockPrisma.companyMember.findFirst.mockResolvedValue({ company_id: 'company-xyz' });
    const ctx = makeContext('user-2');
    await guard.canActivate(ctx);
    expect(ctx.switchToHttp().getRequest().companyId).toBe('company-xyz');
    expect(mockRedis.setex).toHaveBeenCalledWith('tenant:user-2', 60, 'company-xyz');
  });

  it('AUTH-03: sem membership ativo — lança ForbiddenException', async () => {
    mockRedis.get.mockResolvedValue(null);
    mockPrisma.companyMember.findFirst.mockResolvedValue(null);
    await expect(guard.canActivate(makeContext('user-3'))).rejects.toThrow(ForbiddenException);
  });

  it('AUTH-03: sem userId no request — lança ForbiddenException', async () => {
    await expect(guard.canActivate(makeContext())).rejects.toThrow(ForbiddenException);
  });
});
