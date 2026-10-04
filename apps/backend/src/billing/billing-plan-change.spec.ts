import { ConflictException } from '@nestjs/common';
import type { PaymentProvider } from '@orcivo/shared-types';
import { SubscriptionService } from './subscription.service';
import { MercadoPagoWebhookService } from '../webhook/mercadopago-webhook.service';
import type { MercadoPagoPaymentProvider } from './mercadopago.payment-provider';

const COMPANY_ID = 'company-1';

function checkoutHarness(existing: Record<string, unknown> | null) {
  let row = existing ? { ...existing } : null;
  const prisma = {
    company: {
      findUniqueOrThrow: jest.fn(async () => ({
        id: COMPANY_ID,
        trade_name: 'Ribeiro Elétrica',
        document: null,
        members: [{ user: { email: 'joao@exemplo.com.br' } }],
      })),
    },
    subscription: {
      findUnique: jest.fn(async () => row),
      upsert: jest.fn(async ({ create, update }: Record<string, Record<string, unknown>>) => {
        row = row ? { ...row, ...update } : { ...create };
        return row;
      }),
    },
    subscriptionPayment: { upsert: jest.fn() },
  };
  const provider = {
    provider: 'test-provider',
    createCustomer: jest.fn().mockResolvedValue({ id: 'cus_1' }),
    createSubscription: jest.fn().mockResolvedValue({ id: 'new_sub', status: 'PENDING' }),
    cancelSubscription: jest.fn().mockResolvedValue(undefined),
    getSubscription: jest.fn(),
  };
  const service = new SubscriptionService(prisma as never, provider as unknown as PaymentProvider);
  return { service, provider, prisma, getRow: () => row };
}

const paidSolo = {
  company_id: COMPANY_ID,
  plan_code: 'SOLO',
  status: 'ACTIVE',
  asaas_customer_id: 'cus_1',
  asaas_sub_id: 'old_sub',
};

describe('Checkout de quem já paga', () => {
  it('recusa assinar de novo o mesmo plano (evita segunda cobrança)', async () => {
    const { service, provider } = checkoutHarness(paidSolo);
    await expect(service.createCheckout(COMPANY_ID, 'SOLO', 'MONTHLY')).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(provider.createSubscription).not.toHaveBeenCalled();
  });

  it('troca de plano não rebaixa a assinatura ativa nem troca o recurso antes do pagamento', async () => {
    const { service, provider, getRow } = checkoutHarness(paidSolo);
    await service.createCheckout(COMPANY_ID, 'MAIS', 'MONTHLY');

    expect(provider.createSubscription).toHaveBeenCalledWith(
      expect.objectContaining({ externalReference: `${COMPANY_ID}:MAIS` }),
    );
    expect(getRow()).toMatchObject({
      status: 'ACTIVE',
      plan_code: 'SOLO',
      asaas_sub_id: 'old_sub',
    });
    expect(provider.cancelSubscription).not.toHaveBeenCalled();
  });

  it('novo checkout sobre um checkout não pago cancela a cobrança pendente anterior', async () => {
    const { service, provider, getRow } = checkoutHarness({
      ...paidSolo,
      status: 'TRIALING',
      asaas_sub_id: 'pending_sub',
    });
    await service.createCheckout(COMPANY_ID, 'SOLO', 'MONTHLY');

    expect(provider.cancelSubscription).toHaveBeenCalledWith('pending_sub');
    expect(getRow()).toMatchObject({ status: 'TRIALING', asaas_sub_id: 'new_sub' });
  });
});

function webhookHarness() {
  const sub = { id: 'sub-1', ...paidSolo };
  const tx = {
    subscription: {
      findFirst: jest.fn().mockResolvedValue(null),
      findUnique: jest.fn().mockResolvedValue(sub),
      update: jest.fn().mockResolvedValue(undefined),
    },
    company: { update: jest.fn().mockResolvedValue(undefined) },
    subscriptionPayment: { upsert: jest.fn().mockResolvedValue(undefined) },
  };
  const mercadoPago = { cancelSubscription: jest.fn().mockResolvedValue(undefined) };
  const service = new MercadoPagoWebhookService(
    {} as never,
    mercadoPago as unknown as MercadoPagoPaymentProvider,
  );
  const apply = (externalReference: string) =>
    (
      service as unknown as { applyResource: (t: unknown, r: unknown) => Promise<void> }
    ).applyResource(tx, {
      kind: 'payment',
      id: 'new_pay',
      status: 'ACTIVE',
      externalReference,
      amount: null,
      dueDate: null,
      paidAt: null,
    });
  return { tx, mercadoPago, apply };
}

describe('Webhook de pagamento aprovado', () => {
  it('troca de plano confirmada: adota o novo recurso, troca o plano e cancela o antigo', async () => {
    const { tx, mercadoPago, apply } = webhookHarness();
    await apply(`${COMPANY_ID}:MAIS`);

    expect(mercadoPago.cancelSubscription).toHaveBeenCalledWith('old_sub');
    expect(tx.subscription.update).toHaveBeenCalledWith({
      where: { id: 'sub-1' },
      data: expect.objectContaining({
        status: 'ACTIVE',
        plan_code: 'MAIS',
        asaas_sub_id: 'new_pay',
      }),
    });
    expect(tx.company.update).toHaveBeenCalledWith({
      where: { id: COMPANY_ID },
      data: { plan_code: 'MAIS' },
    });
  });

  it('cobrança recorrente do plano atual não troca nada nem cancela a assinatura', async () => {
    const { tx, mercadoPago, apply } = webhookHarness();
    await apply(COMPANY_ID);

    expect(mercadoPago.cancelSubscription).not.toHaveBeenCalled();
    expect(tx.subscription.update).toHaveBeenCalledWith({
      where: { id: 'sub-1' },
      data: { status: 'ACTIVE', past_due_at: null, blocked_at: null },
    });
    expect(tx.company.update).toHaveBeenCalledWith({
      where: { id: COMPANY_ID },
      data: { plan_code: 'SOLO' },
    });
  });
});
