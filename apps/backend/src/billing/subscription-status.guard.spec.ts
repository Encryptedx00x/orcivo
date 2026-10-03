import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { MercadoPagoPaymentProvider, mapPaymentStatus } from './mercadopago.payment-provider';
import { SubscriptionService } from './subscription.service';
import { SubscriptionStatusGuard } from './subscription-status.guard';

function context(method: string, companyId = 'company-1'): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ method, companyId }) }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

function mercadoPagoProvider(): MercadoPagoPaymentProvider {
  return new MercadoPagoPaymentProvider({
    get: (key: string, fallback?: string) =>
      ({ MP_ENV: 'test', MP_ACCESS_TOKEN: 'TEST-only-token' })[key] ?? fallback,
  } as unknown as ConfigService);
}

describe('SubscriptionStatusGuard with MercadoPago', () => {
  it('blocks a mutation when a Mercado Pago chargeback was persisted as BLOCKED', async () => {
    const status = mapPaymentStatus('charged_back');
    const prisma = {
      subscription: { findUnique: jest.fn().mockResolvedValue({ status }) },
    };
    const service = new SubscriptionService(prisma as never, mercadoPagoProvider());
    const reflector = new Reflector();
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    const guard = new SubscriptionStatusGuard(service, reflector);

    await expect(guard.canActivate(context('POST'))).rejects.toThrow(ForbiddenException);
    expect(prisma.subscription.findUnique).toHaveBeenCalledWith({
      where: { company_id: 'company-1' },
    });
  });

  it('still allows read-only requests for a Mercado Pago BLOCKED subscription', async () => {
    const prisma = {
      subscription: { findUnique: jest.fn().mockResolvedValue({ status: 'BLOCKED' }) },
    };
    const service = new SubscriptionService(prisma as never, mercadoPagoProvider());
    const reflector = new Reflector();
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    const guard = new SubscriptionStatusGuard(service, reflector);

    await expect(guard.canActivate(context('GET'))).resolves.toBe(true);
    expect(prisma.subscription.findUnique).not.toHaveBeenCalled();
  });
});
