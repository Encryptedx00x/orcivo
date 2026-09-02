// P02-T11 — request idempotency (X-Client-Request-Id).
jest.mock('@react-pdf/renderer', () => ({
  renderToBuffer: jest.fn().mockResolvedValue(Buffer.from('PDF')),
  Document: ({ children }: never) => children,
  Page: ({ children }: never) => children,
  View: ({ children }: never) => children,
  Text: ({ children }: never) => children,
  Image: () => null,
  StyleSheet: { create: (s: never) => s },
}));

import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import * as crypto from 'crypto';
import { cleanupDatabase, getTestApp } from '../../../test/setup';
import { createTenant, TestTenant } from '../../../test/tenant-factory';

const HDR = 'X-Client-Request-Id';

describe('P02-T11 — request idempotency', () => {
  let app: INestApplication;
  let A: TestTenant;
  const bearer = () => ({ Authorization: `Bearer ${A.token}` });

  const listCustomers = () =>
    request(app.getHttpServer())
      .get('/customers')
      .set(bearer())
      .then((r) => r.body.data as Array<{ id: string; name: string }>);

  beforeAll(async () => {
    app = await getTestApp();
    A = await createTenant(app, 'IDEM');
  });
  afterAll(async () => {
    await cleanupDatabase();
    await app.close();
  });

  it('same key → replay: one effect, identical body', async () => {
    const rid = crypto.randomUUID();
    const first = await request(app.getHttpServer())
      .post('/customers')
      .set(bearer())
      .set(HDR, rid)
      .send({ name: 'Replay Co' });
    expect(first.status).toBe(201);

    const second = await request(app.getHttpServer())
      .post('/customers')
      .set(bearer())
      .set(HDR, rid)
      .send({ name: 'Replay Co' });
    expect(second.status).toBe(201);
    expect(second.body).toEqual(first.body);

    const rows = (await listCustomers()).filter((c) => c.name === 'Replay Co');
    expect(rows).toHaveLength(1);
  });

  it('concurrent same key → exactly one effect (one 201, one 409)', async () => {
    const rid = crypto.randomUUID();
    const fire = () =>
      request(app.getHttpServer())
        .post('/customers')
        .set(bearer())
        .set(HDR, rid)
        .send({ name: 'Race Co' });

    const [a, b] = await Promise.all([fire(), fire()]);
    // The loser is either rejected at claim time (409) or, if the winner already
    // finished, served the winner's stored response (201 replay). Never a 2nd effect.
    for (const r of [a, b]) expect([201, 409]).toContain(r.status);
    expect([a.status, b.status]).toContain(201);

    // a follow-up retry with the same id replays the winner's result
    const retry = await fire();
    expect(retry.status).toBe(201);

    const rows = (await listCustomers()).filter((c) => c.name === 'Race Co');
    expect(rows).toHaveLength(1);
    expect(retry.body.id).toBe(rows[0].id);
  });

  it('retry after lost response (sequential, same key) → no duplicate', async () => {
    const rid = crypto.randomUUID();
    await request(app.getHttpServer())
      .post('/customers')
      .set(bearer())
      .set(HDR, rid)
      .send({ name: 'Lost Co' })
      .expect(201);
    // client never saw the 201, retries
    await request(app.getHttpServer())
      .post('/customers')
      .set(bearer())
      .set(HDR, rid)
      .send({ name: 'Lost Co' })
      .expect(201);

    const rows = (await listCustomers()).filter((c) => c.name === 'Lost Co');
    expect(rows).toHaveLength(1);
  });

  it('different keys → independent effects', async () => {
    await request(app.getHttpServer())
      .post('/customers')
      .set(bearer())
      .set(HDR, crypto.randomUUID())
      .send({ name: 'Indep Co' })
      .expect(201);
    await request(app.getHttpServer())
      .post('/customers')
      .set(bearer())
      .set(HDR, crypto.randomUUID())
      .send({ name: 'Indep Co' })
      .expect(201);

    const rows = (await listCustomers()).filter((c) => c.name === 'Indep Co');
    expect(rows).toHaveLength(2);
  });

  it('same key, different payload → 409 fail-closed (no second effect)', async () => {
    const rid = crypto.randomUUID();
    await request(app.getHttpServer())
      .post('/customers')
      .set(bearer())
      .set(HDR, rid)
      .send({ name: 'Payload A' })
      .expect(201);

    const conflict = await request(app.getHttpServer())
      .post('/customers')
      .set(bearer())
      .set(HDR, rid)
      .send({ name: 'Payload B' });
    expect(conflict.status).toBe(409);

    const rows = (await listCustomers()).filter((c) => c.name === 'Payload B');
    expect(rows).toHaveLength(0);
  });

  it('operational effect: POST /quotes replays without creating a second quote', async () => {
    const cust = await request(app.getHttpServer())
      .post('/customers')
      .set(bearer())
      .send({ name: 'Quote Cust' });
    const rid = crypto.randomUUID();
    const body = {
      customer_id: cust.body.id,
      items: [{ description: 'x', quantity: '1', unit_price: '100.00' }],
    };
    const q1 = await request(app.getHttpServer())
      .post('/quotes')
      .set(bearer())
      .set(HDR, rid)
      .send(body)
      .expect(201);
    const q2 = await request(app.getHttpServer())
      .post('/quotes')
      .set(bearer())
      .set(HDR, rid)
      .send(body)
      .expect(201);
    expect(q2.body.id).toBe(q1.body.id);
    expect(q2.body.number).toBe(q1.body.number);

    const list = await request(app.getHttpServer()).get('/quotes').set(bearer());
    expect(
      (list.body.data as Array<{ id: string }>).filter((x) => x.id === q1.body.id),
    ).toHaveLength(1);
  });

  it('no header → not tracked (two effects)', async () => {
    await request(app.getHttpServer())
      .post('/customers')
      .set(bearer())
      .send({ name: 'NoHdr' })
      .expect(201);
    await request(app.getHttpServer())
      .post('/customers')
      .set(bearer())
      .send({ name: 'NoHdr' })
      .expect(201);
    const rows = (await listCustomers()).filter((c) => c.name === 'NoHdr');
    expect(rows).toHaveLength(2);
  });

  it('GET is never idempotency-tracked', async () => {
    const rid = crypto.randomUUID();
    await request(app.getHttpServer()).get('/customers').set(bearer()).set(HDR, rid).expect(200);
    await request(app.getHttpServer()).get('/customers').set(bearer()).set(HDR, rid).expect(200);
  });

  it('multipart (photo upload): same key replays without a second photo', async () => {
    const cust = await request(app.getHttpServer())
      .post('/customers')
      .set(bearer())
      .send({ name: 'WO Cust' });
    const wo = await request(app.getHttpServer())
      .post('/work-orders')
      .set(bearer())
      .send({ customer_id: cust.body.id, title: 'WO' });
    // 1x1 PNG
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      'base64',
    );
    const rid = crypto.randomUUID();
    const up1 = await request(app.getHttpServer())
      .post(`/work-orders/${wo.body.id}/photos`)
      .set(bearer())
      .set(HDR, rid)
      .field('stage', 'BEFORE')
      .attach('file', png, 'p.png');
    expect(up1.status).toBe(201);

    const up2 = await request(app.getHttpServer())
      .post(`/work-orders/${wo.body.id}/photos`)
      .set(bearer())
      .set(HDR, rid)
      .field('stage', 'BEFORE')
      .attach('file', png, 'p.png');
    expect(up2.status).toBe(201);
    expect(up2.body.id).toBe(up1.body.id);

    const photos = await request(app.getHttpServer())
      .get(`/work-orders/${wo.body.id}/photos`)
      .set(bearer());
    expect(photos.body).toHaveLength(1);
  });

  it('signup/company double-submit is idempotent (one company, both return a session)', async () => {
    const email = `dup.${crypto.randomUUID()}@isolation.test`;
    const step1 = await request(app.getHttpServer()).post('/auth/signup/user').send({
      name: 'Dup',
      email,
      phone: '11900000000',
      password: 'Senha@Teste123',
      accepted_terms: true,
    });
    const t = step1.body.access_token;
    const c1 = await request(app.getHttpServer())
      .post('/auth/signup/company')
      .set('Authorization', `Bearer ${t}`)
      .send({ trade_name: 'Dup Co', document_type: 'CNPJ' });
    const c2 = await request(app.getHttpServer())
      .post('/auth/signup/company')
      .set('Authorization', `Bearer ${t}`)
      .send({ trade_name: 'Dup Co Again', document_type: 'CNPJ' });

    expect(c1.status).toBe(201);
    expect(c2.status).toBeLessThan(300);
    expect(c2.body.company.id).toBe(c1.body.company.id);
    expect(c2.body.access_token).toBeTruthy();
  });
});
