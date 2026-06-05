import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Billing smoke tests (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;

  const testEmail = `billing-smoke-${Date.now()}@test.com`;
  const testPassword = 'Test1234!';

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();

    // Criar empresa de teste
    await request(app.getHttpServer())
      .post('/auth/signup/step1')
      .send({ email: testEmail, password: testPassword, accepted_terms: true });

    await request(app.getHttpServer())
      .post('/auth/signup/step2')
      .send({ trade_name: 'Empresa Smoke Test' });

    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: testEmail, password: testPassword });

    accessToken = loginRes.body.access_token;
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /me/plan-limits retorna limites para empresa LIVRE', async () => {
    const res = await request(app.getHttpServer())
      .get('/me/plan-limits')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.plan_code).toBe('LIVRE');
    expect(res.body.pdf_watermark).toBe(true);
    expect(res.body.customers_max).toBe(5);
  });

  it('GET /me/subscription-status retorna is_blocked:false para empresa LIVRE', async () => {
    const res = await request(app.getHttpServer())
      .get('/me/subscription-status')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.is_blocked).toBe(false);
    expect(res.body.status).toBeNull();
  });

  it('POST /webhooks/asaas é idempotente — segundo envio retorna duplicate:true', async () => {
    const payload = {
      event: 'PAYMENT_CONFIRMED',
      payment: {
        id: `pay_smoke_${Date.now()}`,
        customer: 'cus_smoke_test',
        status: 'CONFIRMED',
        value: 79.90,
        dueDate: '2026-06-01',
      },
    };

    const first = await request(app.getHttpServer())
      .post('/webhooks/asaas')
      .set('asaas-access-token', process.env.ASAAS_WEBHOOK_TOKEN ?? 'test_token')
      .send(payload);

    expect(first.status).toBe(201);
    expect(first.body.received).toBe(true);

    const second = await request(app.getHttpServer())
      .post('/webhooks/asaas')
      .set('asaas-access-token', process.env.ASAAS_WEBHOOK_TOKEN ?? 'test_token')
      .send(payload);

    expect(second.status).toBe(201);
    expect(second.body.duplicate).toBe(true);
  });
});
