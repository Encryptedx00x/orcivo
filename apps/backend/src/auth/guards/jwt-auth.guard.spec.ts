import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { JwtAuthGuard } from './jwt-auth.guard';

function makeContext(isPublicOnHandler: boolean, isPublicOnClass: boolean): ExecutionContext {
  return {
    getHandler: () => (isPublicOnHandler ? { [IS_PUBLIC_KEY]: true } : {}),
    getClass: () => (isPublicOnClass ? { [IS_PUBLIC_KEY]: true } : {}),
  } as unknown as ExecutionContext;
}

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new JwtAuthGuard(reflector);
  });

  it('@Public no handler — retorna true sem chamar super', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);
    const result = guard.canActivate(makeContext(true, false));
    expect(result).toBe(true);
  });

  it('@Public na classe — retorna true sem chamar super', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);
    const result = guard.canActivate(makeContext(false, true));
    expect(result).toBe(true);
  });

  it('sem @Public — delega para AuthGuard JWT (requer token)', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    const superCanActivate = jest.spyOn(
      Object.getPrototypeOf(Object.getPrototypeOf(guard)),
      'canActivate',
    ).mockReturnValue(false);
    const result = guard.canActivate(makeContext(false, false));
    expect(superCanActivate).toHaveBeenCalled();
    expect(result).toBe(false);
  });
});
