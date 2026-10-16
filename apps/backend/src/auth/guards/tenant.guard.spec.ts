import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TenantGuard } from './tenant.guard';

const mockPrisma = { companyMember: { findUnique: jest.fn() } };
const mockRedis = { get: jest.fn(), setex: jest.fn(), del: jest.fn() };

function makeContext(userId?: string, companyId = 'company-abc'): ExecutionContext {
  const request: Record<string, unknown> = {
    user: userId ? { userId, companyId } : undefined,
  };
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
    expect(mockPrisma.companyMember.findUnique).not.toHaveBeenCalled();
  });

  it('cache hit — injects companyId + role without hitting the DB', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    mockRedis.get.mockResolvedValue(JSON.stringify({ role: 'ADMIN' }));
    const ctx = makeContext('user-1') as never as { __request: Record<string, unknown> };
    await guard.canActivate(ctx as never);
    expect(ctx.__request.companyId).toBe('company-abc');
    expect(ctx.__request.role).toBe('ADMIN');
    expect(mockPrisma.companyMember.findUnique).not.toHaveBeenCalled();
  });

  it('cache miss — resolves from DB and caches JSON for 60s', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    mockRedis.get.mockResolvedValue(null);
    mockPrisma.companyMember.findUnique.mockResolvedValue({ active: true, role: 'TECNICO' });
    const ctx = makeContext('user-2', 'company-xyz') as never as {
      __request: Record<string, unknown>;
    };
    await guard.canActivate(ctx as never);
    expect(ctx.__request.companyId).toBe('company-xyz');
    expect(ctx.__request.role).toBe('TECNICO');
    expect(mockRedis.setex).toHaveBeenCalledWith(
      'membership:user-2:company-xyz',
      60,
      JSON.stringify({ role: 'TECNICO' }),
    );
  });

  it('malformed cache — falls through to the DB', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    mockRedis.get.mockResolvedValue('not-json');
    mockPrisma.companyMember.findUnique.mockResolvedValue({ active: true, role: 'OWNER' });
    await guard.canActivate(makeContext('user-3', 'c1') as never);
    expect(mockPrisma.companyMember.findUnique).toHaveBeenCalled();
  });

  it('no active membership — fail closed (403)', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    mockRedis.get.mockResolvedValue(null);
    mockPrisma.companyMember.findUnique.mockResolvedValue(null);
    await expect(guard.canActivate(makeContext('user-4') as never)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('no userId on request — fail closed (403)', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    await expect(guard.canActivate(makeContext() as never)).rejects.toThrow(ForbiddenException);
  });
});
