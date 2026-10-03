import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { createHmac } from 'crypto';
import request from 'supertest';
import { MercadoPagoWebhookController } from '../webhook/mercadopago-webhook.controller';
import { MercadoPagoWebhookService } from '../webhook/mercadopago-webhook.service';
import type { MercadoPagoPaymentProvider } from './mercadopago.payment-provider';
import type { PrismaService } from '../prisma/prisma.service';

const WEBHOOK_SECRET = 'test-webhook-secret';
const DATA_ID = 'ABC123';
const REQUEST_ID = 'request-1';
const NOTIFICATION_ID = 'notification-1';

function signature(dataId = DATA_ID, requestId = REQUEST_ID, secret = WEBHOOK_SECRET) {
  const ts = '1700000000';
  const manifest = `id:${dataId.toLowerCase()};request-id:${requestId};ts:${ts};`;
  const digest = createHmac('sha256', secret).update(manifest).digest('hex');
  return `ts=${ts},v1=${digest}`;
}

function buildWebhookHarness() {
  let event: { id: string; status: string; idempotency_key: string } | undefined;
  const subscriptionUpdate = jest.fn().mockResolvedValue(undefined);
  const fetchResource = jest.fn().mockResolvedValue({
    kind: 'payment',
    id: DATA_ID,
    status: 'ACTIVE',
    externalReference: 'company-1',
    amount: null,
    dueDate: null,
    paidAt: null,
  });
  const transaction = {
    subscription: {
      findFirst: jest.fn().mockResolvedValue({
        id: 'sub-1',
        company_id: 'company-1',
        status: 'PAST_DUE',
        plan_code: 'SOLO',
      }),
      update: subscriptionUpdate,
      findUnique: jest.fn(),
    },
    company: { update: jest.fn().mockResolvedValue(undefined) },
    subscriptionPayment: { upsert: jest.fn().mockResolvedValue(undefined) },
    webhookEvent: {
      update: jest.fn().mockImplementation(async ({ data }: { data: { status: string } }) => {
        if (event) event.status = data.status;
      }),
    },
  };
  const prisma = {
    webhookEvent: {
      create: jest
        .fn()
        .mockImplementation(async ({ data }: { data: { idempotency_key: string } }) => {
          if (event) throw { code: 'P2002' };
          event = {
            id: 'webhook-event-1',
            status: 'PENDING',
            idempotency_key: data.idempotency_key,
          };
          return event;
        }),
      findUniqueOrThrow: jest.fn().mockImplementation(async () => event),
      update: jest.fn().mockResolvedValue(undefined),
      updateMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
    $transaction: jest.fn((callback: (tx: typeof transaction) => Promise<void>) =>
      callback(transaction),
    ),
  };
  const mercadoPago = { fetchResource };
  const service = new MercadoPagoWebhookService(
    prisma as unknown as PrismaService,
    mercadoPago as unknown as MercadoPagoPaymentProvider,
  );

  return { service, fetchResource, subscriptionUpdate, getEvent: () => event };
}

describe('Mercado Pago webhook HTTP (e2e)', () => {
  let app: INestApplication;
  let harness: ReturnType<typeof buildWebhookHarness>;

  beforeEach(async () => {
    harness = buildWebhookHarness();
    const moduleRef = await Test.createTestingModule({
      controllers: [MercadoPagoWebhookController],
      providers: [
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue(WEBHOOK_SECRET) } },
        { provide: MercadoPagoWebhookService, useValue: harness.service },
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  function notify(webhookSignature: string, notificationId = NOTIFICATION_ID) {
    return request(app.getHttpServer())
      .post(`/webhooks/mercadopago?data.id=${DATA_ID}&type=payment`)
      .set('x-request-id', REQUEST_ID)
      .set('x-signature', webhookSignature)
      .send({ id: notificationId, action: 'payment.updated' });
  }

  it('accepts a valid signed notification and persists the MP-fetched state', async () => {
    const response = await notify(signature());

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ received: true });
    expect(harness.fetchResource).toHaveBeenCalledWith('payment', DATA_ID);
    expect(harness.subscriptionUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'ACTIVE' }) }),
    );
    expect(harness.getEvent()).toMatchObject({ status: 'PROCESSED' });
  });

  it('rejects an invalid signature before any provider or persistence interaction', async () => {
    const response = await notify(signature(DATA_ID, REQUEST_ID, 'wrong-secret'));

    expect(response.status).toBe(401);
    expect(harness.fetchResource).not.toHaveBeenCalled();
    expect(harness.subscriptionUpdate).not.toHaveBeenCalled();
    expect(harness.getEvent()).toBeUndefined();
  });

  it('acknowledges a replay idempotently without another MP lookup or state update', async () => {
    await expect(notify(signature())).resolves.toMatchObject({ status: 200 });
    harness.fetchResource.mockClear();
    harness.subscriptionUpdate.mockClear();

    const replay = await notify(signature());

    expect(replay.status).toBe(200);
    expect(replay.body).toEqual({ received: true, duplicate: true });
    expect(harness.fetchResource).not.toHaveBeenCalled();
    expect(harness.subscriptionUpdate).not.toHaveBeenCalled();
    expect(harness.getEvent()).toMatchObject({ status: 'PROCESSED' });
  });
});
