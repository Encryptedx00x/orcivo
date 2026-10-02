import { INestApplication } from '@nestjs/common';
import { createHmac } from 'crypto';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { cleanupDatabase, getTestApp } from './setup';
import { createTenant } from './tenant-factory';

// L2-P02-mercadopago-webhook — POST /webhooks/mercadopago (sandbox/test credentials only).
const HMAC_KEY = ['e2e', 'test', 'webhook', 'key'].join('-');
const PREAPPROVAL_ID = 'e2e-preapproval-0001';

function signedHeaders(dataId: string, requestId: string, hmacKey = HMAC_KEY) {
  const ts = String(Date.now());
  const manifest = `id:${dataId.toLowerCase()};request-id:${requestId};ts:${ts};`;
  const v1 = createHmac('sha256', hmacKey).update(manifest).digest('hex');
  return { 'x-signature': `ts=${ts},v1=${v1}`, 'x-request-id': requestId };
}

describe('Mercado Pago webhook (e2e) (L2-P02)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let companyId: string;
  let fetchSpy: jest.SpyInstance;
  let mpStatus = 'authorized';

  const notify = (dataId: string, headers: Record<string, string>, notificationId: string) =>
    request(app.getHttpServer())
      .post(`/webhooks/mercadopago?data.id=${dataId}&type=subscription_preapproval`)
      .set(headers)
      .send({
        id: notificationId,
        type: 'subscription_preapproval',
        action: 'updated',
        data: { id: dataId },
      });

  const mpCalls = () =>
    fetchSpy.mock.calls.filter(([url]) => String(url).includes('/preapproval/'));

  beforeAll(async () => {
    process.env['MP_ENV'] = 'sandbox';
    process.env['MP_ACCESS_TOKEN'] = 'TEST-e2e-access-token';
    process.env['MP_WEBHOOK_SECRET'] = HMAC_KEY;

    app = await getTestApp();
    prisma = app.get(PrismaService);

    const tenant = await createTenant(app, 'mpwh');
    companyId = tenant.companyId;
    await prisma.subscription.create({
      data: {
        company_id: companyId,
        plan_code: 'SOLO',
        status: 'PAST_DUE',
        past_due_at: new Date(),
        asaas_sub_id: PREAPPROVAL_ID,
      },
    });

    // The MP API is stubbed at the HTTP client boundary; supertest talks to Nest over
    // node:http, so global fetch is only used by the MP adapter.
    fetchSpy = jest.spyOn(global, 'fetch').mockImplementation(async () => {
      const body = { id: PREAPPROVAL_ID, status: mpStatus, external_reference: companyId };
      return {
        ok: true,
        status: 200,
        json: async () => body,
        text: async () => JSON.stringify(body),
      } as unknown as Response;
    });
  });

  afterAll(async () => {
    fetchSpy.mockRestore();
    await app.close();
    await cleanupDatabase();
  });

  beforeEach(() => fetchSpy.mockClear());

  it('AC1: assinatura HMAC inválida → 401, sem consultar o MP nem gravar evento', async () => {
    const bad = signedHeaders(PREAPPROVAL_ID, 'req-bad-1', 'wrong-key');
    const res = await notify(PREAPPROVAL_ID, bad, 'evt-bad-1');

    expect(res.status).toBe(401);
    expect(mpCalls()).toHaveLength(0);
    expect(await prisma.webhookEvent.count({ where: { event_id: 'evt-bad-1' } })).toBe(0);
    const sub = await prisma.subscription.findUniqueOrThrow({ where: { company_id: companyId } });
    expect(sub.status).toBe('PAST_DUE');
  });

  it('AC1: assinatura ausente ou assinada para outro data.id → 401', async () => {
    const missing = await request(app.getHttpServer())
      .post(`/webhooks/mercadopago?data.id=${PREAPPROVAL_ID}`)
      .send({ id: 'evt-missing', type: 'subscription_preapproval' });
    expect(missing.status).toBe(401);

    const other = signedHeaders('some-other-resource', 'req-other-1');
    const res = await notify(PREAPPROVAL_ID, other, 'evt-other-1');
    expect(res.status).toBe(401);
    expect(mpCalls()).toHaveLength(0);
  });

  it('AC2: assinatura válida → consulta o recurso na API MP e só então ativa a assinatura', async () => {
    const res = await notify(
      PREAPPROVAL_ID,
      signedHeaders(PREAPPROVAL_ID, 'req-ok-1'),
      'evt-ok-1',
    );

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ received: true });
    expect(mpCalls()).toHaveLength(1);
    expect(String(mpCalls()[0][0])).toContain(`/preapproval/${PREAPPROVAL_ID}`);

    const sub = await prisma.subscription.findUniqueOrThrow({ where: { company_id: companyId } });
    expect(sub.status).toBe('ACTIVE');
    expect(sub.past_due_at).toBeNull();
    const company = await prisma.company.findUniqueOrThrow({ where: { id: companyId } });
    expect(company.plan_code).toBe('SOLO');

    const events = await prisma.webhookEvent.findMany({ where: { event_id: 'evt-ok-1' } });
    expect(events).toHaveLength(1);
    expect(events[0].provider).toBe('MERCADOPAGO');
    expect(events[0].status).toBe('PROCESSED');
  });

  it('AC3: reenvio do mesmo evento é no-op idempotente', async () => {
    const replay = await notify(
      PREAPPROVAL_ID,
      signedHeaders(PREAPPROVAL_ID, 'req-ok-1-retry'),
      'evt-ok-1',
    );

    expect(replay.status).toBe(200);
    expect(replay.body.duplicate).toBe(true);
    expect(mpCalls()).toHaveLength(0);
    expect(await prisma.webhookEvent.count({ where: { event_id: 'evt-ok-1' } })).toBe(1);
  });

  it('estado vem da API do MP, não do payload: cancelled no MP → CANCELLED', async () => {
    mpStatus = 'cancelled';
    const res = await notify(
      PREAPPROVAL_ID,
      signedHeaders(PREAPPROVAL_ID, 'req-cancel-1'),
      'evt-cancel-1',
    );

    expect(res.status).toBe(200);
    expect(mpCalls()).toHaveLength(1);
    const sub = await prisma.subscription.findUniqueOrThrow({ where: { company_id: companyId } });
    expect(sub.status).toBe('CANCELLED');
    expect(sub.cancelled_at).not.toBeNull();
  });

  it('AC4: rota antiga do Asaas não existe mais', async () => {
    const res = await request(app.getHttpServer())
      .post('/webhooks/asaas')
      .set('asaas-access-token', 'any')
      .send({ event: 'PAYMENT_CONFIRMED', payment: { id: 'pay_legacy' } });

    expect([404, 410]).toContain(res.status);
  });
});
