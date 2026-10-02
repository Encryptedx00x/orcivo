import { createHmac } from 'crypto';
import { isValidMercadoPagoSignature } from './mercadopago-webhook.signature';
import { MercadoPagoWebhookService } from './mercadopago-webhook.service';
import type { MercadoPagoPaymentProvider } from '../billing/mercadopago.payment-provider';
import type { PrismaService } from '../prisma/prisma.service';

const HMAC_KEY = ['unit', 'test', 'webhook', 'key'].join('-');

function sign(dataId: string, requestId: string, ts = '1700000000', secret = HMAC_KEY) {
  const v1 = createHmac('sha256', secret)
    .update(`id:${dataId.toLowerCase()};request-id:${requestId};ts:${ts};`)
    .digest('hex');
  return `ts=${ts},v1=${v1}`;
}

describe('isValidMercadoPagoSignature', () => {
  const base = { requestId: 'req-1', dataId: 'ABC123', secret: HMAC_KEY };

  it('accepts a correctly signed notification (data.id lower-cased)', () => {
    expect(isValidMercadoPagoSignature({ ...base, signature: sign('ABC123', 'req-1') })).toBe(true);
  });

  it.each([
    ['wrong secret', { signature: sign('ABC123', 'req-1', '1700000000', 'other') }],
    ['other data.id', { signature: sign('zzz', 'req-1') }],
    ['other request-id', { signature: sign('ABC123', 'req-2') }],
    ['missing signature', { signature: undefined }],
    ['malformed signature', { signature: 'garbage' }],
    ['missing secret', { signature: sign('ABC123', 'req-1'), secret: '' }],
    ['missing data.id', { signature: sign('ABC123', 'req-1'), dataId: undefined }],
  ])('rejects %s', (_name, override) => {
    expect(isValidMercadoPagoSignature({ ...base, ...override })).toBe(false);
  });
});

describe('MercadoPagoWebhookService', () => {
  const resource = {
    kind: 'preapproval' as const,
    id: 'pre-1',
    status: 'ACTIVE' as const,
    externalReference: 'company-1',
    amount: null,
    dueDate: null,
    paidAt: null,
  };
  const notification = {
    dataId: 'pre-1',
    topic: 'subscription_preapproval',
    body: { id: 'evt-1', action: 'updated' },
    signatureTs: '1700000000',
  };

  function build() {
    const tx = {
      subscription: {
        findFirst: jest.fn().mockResolvedValue({ id: 'sub-1', company_id: 'company-1', status: 'PAST_DUE', plan_code: 'SOLO' }),
        update: jest.fn(),
      },
      company: { update: jest.fn() },
      subscriptionPayment: { upsert: jest.fn() },
      webhookEvent: { update: jest.fn() },
    };
    const prisma = {
      webhookEvent: {
        create: jest.fn().mockResolvedValue({ id: 'we-1' }),
        update: jest.fn().mockResolvedValue({}),
        findUniqueOrThrow: jest.fn(),
        updateMany: jest.fn(),
      },
      $transaction: jest.fn((fn: (t: typeof tx) => Promise<void>) => fn(tx)),
    };
    const mp = { fetchResource: jest.fn().mockResolvedValue(resource) };
    const service = new MercadoPagoWebhookService(
      prisma as unknown as PrismaService,
      mp as unknown as MercadoPagoPaymentProvider,
    );
    return { service, prisma, tx, mp };
  }

  it('fetches the real resource, then activates the subscription and marks the event PROCESSED', async () => {
    const { service, mp, tx } = build();
    await expect(service.handle(notification)).resolves.toEqual({ received: true });

    expect(mp.fetchResource).toHaveBeenCalledWith('preapproval', 'pre-1');
    expect(tx.subscription.update).toHaveBeenCalledWith({
      where: { id: 'sub-1' },
      data: { status: 'ACTIVE', past_due_at: null, blocked_at: null },
    });
    expect(tx.webhookEvent.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'PROCESSED' }) }),
    );
  });

  it('replay (unique violation on a processed event) is a no-op: no MP call, no state change', async () => {
    const { service, prisma, mp, tx } = build();
    prisma.webhookEvent.create.mockRejectedValue({ code: 'P2002' });
    prisma.webhookEvent.findUniqueOrThrow.mockResolvedValue({ id: 'we-1', status: 'PROCESSED' });

    await expect(service.handle(notification)).resolves.toEqual({ received: true, duplicate: true });
    expect(mp.fetchResource).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(tx.subscription.update).not.toHaveBeenCalled();
  });

  it('does not change state when the MP lookup fails; event is marked FAILED and 502 is raised', async () => {
    const { service, prisma, mp } = build();
    mp.fetchResource.mockRejectedValue(new Error('boom'));

    await expect(service.handle(notification)).rejects.toThrow('Falha ao consultar o Mercado Pago');
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(prisma.webhookEvent.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'FAILED' }) }),
    );
  });

  it('skips unhandled topics without calling MP', async () => {
    const { service, mp } = build();
    await service.handle({ ...notification, topic: 'merchant_order' });
    expect(mp.fetchResource).not.toHaveBeenCalled();
  });
});
