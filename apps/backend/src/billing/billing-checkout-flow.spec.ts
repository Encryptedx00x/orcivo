import { BadGatewayException, BadRequestException } from '@nestjs/common';
import type { PaymentProvider } from '@orcivo/shared-types';
import { BillingController } from './billing.controller';
import { SubscriptionService } from './subscription.service';
import type { TenantRequest } from '../common/interfaces/tenant-request.interface';

const COMPANY_ID = 'company-1';
const req = { companyId: COMPANY_ID } as unknown as TenantRequest;

/** In-memory stand-in for the subscriptions table (one row per company). */
function buildHarness() {
  let row: Record<string, unknown> | null = null;

  const prisma = {
    company: {
      findUniqueOrThrow: jest.fn(async () => ({
        id: COMPANY_ID,
        trade_name: 'Ribeiro Elétrica',
        document: null,
        plan_code: 'LIVRE',
        members: [{ user: { email: 'joao@exemplo.com.br' } }],
      })),
    },
    subscription: {
      findUnique: jest.fn(async () => row),
      create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
        row = { ...data };
        return row;
      }),
      upsert: jest.fn(
        async ({
          create,
          update,
        }: {
          create: Record<string, unknown>;
          update: Record<string, unknown>;
        }) => {
          row = row ? { ...row, ...update } : { ...create };
          return row;
        },
      ),
      update: jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
        row = { ...row, ...data };
        return row;
      }),
    },
  };

  const provider = {
    provider: 'test-provider',
    createCustomer: jest.fn().mockResolvedValue({ id: 'cus_1' }),
    createSubscription: jest.fn().mockResolvedValue({
      id: 'sub_1',
      status: 'PENDING',
      customerId: 'cus_1',
      amount: '79.90',
      nextDueDate: '2026-10-03',
      checkoutUrl: 'https://pay.example/checkout/sub_1',
    }),
    cancelSubscription: jest.fn().mockResolvedValue(undefined),
    getSubscription: jest.fn(),
  };

  const service = new SubscriptionService(prisma as never, provider as unknown as PaymentProvider);
  const controller = new BillingController(service);
  return { controller, service, prisma, provider, getRow: () => row };
}

describe('Billing checkout flow (plan_code sem sufixo + billing_cycle)', () => {
  it('checkout autenticado cria a assinatura e ela aparece em GET /billing/subscription', async () => {
    const { controller, provider } = buildHarness();

    const result = await controller.createCheckout(req, {
      plan_code: 'SOLO',
      billing_cycle: 'YEARLY',
      payment_method: 'CREDIT_CARD',
    });

    expect(provider.createSubscription).toHaveBeenCalledWith(
      expect.objectContaining({ billingCycle: 'YEARLY', paymentMethod: 'CREDIT_CARD', amount: '79.90' }),
    );
    expect(result.checkout_url).toBe('https://pay.example/checkout/sub_1');

    const current = await controller.getSubscription(req);
    expect(current.plan_code).toBe('SOLO');
  });

  it('troca de plano reutiliza o checkout e atualiza o plano da assinatura', async () => {
    const { controller } = buildHarness();
    await controller.createCheckout(req, { plan_code: 'SOLO', billing_cycle: 'MONTHLY' });
    await controller.createCheckout(req, { plan_code: 'MAIS', billing_cycle: 'MONTHLY' });

    expect((await controller.getSubscription(req)).plan_code).toBe('MAIS');
  });

  it.each([
    [{ plan_code: 'SOLO_MONTHLY', billing_cycle: 'MONTHLY' }],
    [{ plan_code: 'LIVRE', billing_cycle: 'MONTHLY' }],
    [{ plan_code: 'SOLO' }],
    [{ plan_code: 'SOLO', billing_cycle: 'WEEKLY' }],
    [{ plan_code: 'SOLO', billing_cycle: 'MONTHLY', payment_method: 'BOLETO' }],
    [undefined],
  ])('rejeita corpo inválido %j com 400 sem chamar o provedor', async (body) => {
    const { controller, provider } = buildHarness();
    await expect(controller.createCheckout(req, body as never)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(provider.createSubscription).not.toHaveBeenCalled();
  });

  it('cancelar: encerra no provedor e marca a assinatura como CANCELLED', async () => {
    const { controller, provider, getRow } = buildHarness();
    await controller.createCheckout(req, { plan_code: 'SOLO', billing_cycle: 'MONTHLY' });

    const result = await controller.cancelSubscription(req);

    expect(provider.cancelSubscription).toHaveBeenCalledWith('sub_1');
    expect(result.status).toBe('CANCELLED');
    expect(getRow()?.['cancelled_at']).toBeInstanceOf(Date);
  });

  it('cancelar sem assinatura paga retorna 400', async () => {
    const { controller, provider } = buildHarness();
    await expect(controller.cancelSubscription(req)).rejects.toBeInstanceOf(BadRequestException);
    expect(provider.cancelSubscription).not.toHaveBeenCalled();
  });

  it('cancelar não altera a assinatura local se o provedor falhar', async () => {
    const { controller, provider, getRow } = buildHarness();
    await controller.createCheckout(req, { plan_code: 'SOLO', billing_cycle: 'MONTHLY' });
    provider.cancelSubscription.mockRejectedValueOnce(new Error('provider down'));

    await expect(controller.cancelSubscription(req)).rejects.toBeInstanceOf(BadGatewayException);
    expect(getRow()?.['status']).toBe('TRIALING');
  });

  it('cancelar duas vezes é idempotente', async () => {
    const { controller, provider } = buildHarness();
    await controller.createCheckout(req, { plan_code: 'SOLO', billing_cycle: 'MONTHLY' });
    await controller.cancelSubscription(req);
    const again = await controller.cancelSubscription(req);

    expect(again.status).toBe('CANCELLED');
    expect(provider.cancelSubscription).toHaveBeenCalledTimes(1);
  });
});
