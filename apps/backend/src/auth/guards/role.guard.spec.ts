import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RoleGuard } from './role.guard';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { ROLES_KEY } from '../decorators/roles.decorator';

function makeContext(role?: string): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ role }) }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

describe('RoleGuard (ADR-014)', () => {
  let guard: RoleGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RoleGuard(reflector);
  });

  function stub(meta: Record<string, unknown>) {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockImplementation(((key: unknown) => meta[key as string]) as never);
  }

  it('no @Roles metadata — any active member passes', () => {
    stub({});
    expect(guard.canActivate(makeContext('TECNICO'))).toBe(true);
  });

  it('@Public — passes regardless of role', () => {
    stub({ [IS_PUBLIC_KEY]: true, [ROLES_KEY]: ['OWNER'] });
    expect(guard.canActivate(makeContext(undefined))).toBe(true);
  });

  it('@Roles(OWNER,ADMIN) + role ADMIN — allowed', () => {
    stub({ [ROLES_KEY]: ['OWNER', 'ADMIN'] });
    expect(guard.canActivate(makeContext('ADMIN'))).toBe(true);
  });

  it('@Roles(OWNER,ADMIN) + role TECNICO — 403', () => {
    stub({ [ROLES_KEY]: ['OWNER', 'ADMIN'] });
    expect(() => guard.canActivate(makeContext('TECNICO'))).toThrow(ForbiddenException);
  });

  it('@Roles present but req.role missing — fail closed (403)', () => {
    stub({ [ROLES_KEY]: ['OWNER', 'ADMIN'] });
    expect(() => guard.canActivate(makeContext(undefined))).toThrow(ForbiddenException);
  });
});
