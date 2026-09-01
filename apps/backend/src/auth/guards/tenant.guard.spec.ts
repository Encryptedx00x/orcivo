import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TenantGuard } from './tenant.guard';

const mockPrisma = { companyMember: { findFirst: jest.fn() } };
const mockRedis = { get: jest.fn(), setex: jest.fn(), del: jest.fn() };

function makeContext(userId?: string): ExecutionContext {
  const request: Record<string, unknown> = { user: userId ? { userId } : undefined };
  return {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => ({}),
    getClass: () => ({}),
    __request: request,
  } as unknown as ExecutionContext & { __request: Record<string, unknown> };
}

describe('TenantGuard (global, ADR-014)', () => {
  let guard: TenantGuard;
  let reflector: Reflector;

  beforeEach(() => {
    jest.clearAllMocks();
    reflector = new Reflector();
    guard = new TenantGuard(mockPrisma as never, mockRedis as never, reflector);
  });

  it('@Public route — passes without resolving tenant', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);
    const ctx = makeContext('user-1');
    expect(await guard.canActivate(ctx)).toBe(true);
    expect(mockRedis.get).not.toHaveBeenCalled();
    expect(mockPrisma.companyMember.findFirst).not.toHaveBeenCalled();
  });

  it('cache hit — injects companyId + role without hitting the DB', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    mockRedis.get.mockResolvedValue(JSON.stringify({ companyId: 'company-abc', role: 'ADMIN' }));
    const ctx = makeContext('user-1') as never as { __request: Record<string, unknown> };
    await guard.canActivate(ctx as never);
    expect(ctx.__request.companyId).toBe('company-abc');
    expect(ctx.__request.role).toBe('ADMIN');
    expect(mockPrisma.companyMember.findFirst).not.toHaveBeenCalled();
  });

  it('cache miss — resolves from DB and caches JSON for 60s', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    mockRedis.get.mockResolvedValue(null);
    mockPrisma.companyMember.findFirst.mockResolvedValue({
      company_id: 'company-xyz',
      role: 'TECNICO',
    });
    const ctx = makeContext('user-2') as never as { __request: Record<string, unknown> };
    await guard.canActivate(ctx as never);
    expect(ctx.__request.companyId).toBe('company-xyz');
    expect(ctx.__request.role).toBe('TECNICO');
    expect(mockRedis.setex).toHaveBeenCalledWith(
      'tenant:user-2',
      60,
      JSON.stringify({ companyId: 'company-xyz', role: 'TECNICO' }),
    );
  });

  it('malformed cache — falls through to the DB', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    mockRedis.get.mockResolvedValue('not-json');
    mockPrisma.companyMember.findFirst.mockResolvedValue({ company_id: 'c1', role: 'OWNER' });
    await guard.canActivate(makeContext('user-3') as never);
    expect(mockPrisma.companyMember.findFirst).toHaveBeenCalled();
  });

  it('no active membership — fail closed (403)', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    mockRedis.get.mockResolvedValue(null);
    mockPrisma.companyMember.findFirst.mockResolvedValue(null);
    await expect(guard.canActivate(makeContext('user-4') as never)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('no userId on request — fail closed (403)', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    await expect(guard.canActivate(makeContext() as never)).rejects.toThrow(ForbiddenException);
  });
});
