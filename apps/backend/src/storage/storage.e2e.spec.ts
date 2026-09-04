// P03-T13 — private storage UAT, automated: real HTTP + real DB + real MinIO
// (test infra). Covers what a human clicking through the UI would check:
// authenticated open of PDF/photo, anonymous denial, tampered signature,
// cross-tenant denial.
jest.mock('@react-pdf/renderer', () => ({
  renderToBuffer: jest.fn().mockResolvedValue(Buffer.from('%PDF-fake-quote')),
  Document: ({ children }: never) => children,
  Page: ({ children }: never) => children,
  View: ({ children }: never) => children,
  Text: ({ children }: never) => children,
  Image: () => null,
  StyleSheet: { create: (s: never) => s },
}));

import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { cleanupDatabase, getTestApp } from '../../test/setup';
import { addMember, createCustomer, createTenant, TestTenant } from '../../test/tenant-factory';

// 1x1 PNG, same fixture used by storage.isolation.spec.ts
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
);

describe('P03-T13 — private storage UAT (automated)', () => {
  let app: INestApplication;
  let A: TestTenant;
  let B: TestTenant;
  let quoteId: string;
  let workOrderId: string;
  let pdfUrl: string;
  let photoUrl: string;

  const auth = (t: string) => ({ Authorization: `Bearer ${t}` });

  beforeAll(async () => {
    app = await getTestApp();
    A = await createTenant(app, 'stoA');
    B = await createTenant(app, 'stoB');
    void addMember; // reserved if role-scoped checks are added later

    const customerId = await createCustomer(app, A.token, 'Cliente Storage');

    const quote = await request(app.getHttpServer())
      .post('/quotes')
      .set(auth(A.token))
      .send({
        customer_id: customerId,
        items: [{ description: 'Serviço', quantity: '1', unit_price: '50.00' }],
      });
    quoteId = quote.body.id;

    const sent = await request(app.getHttpServer())
      .post(`/quotes/${quoteId}/send`)
      .set(auth(A.token))
      .expect(200);
    pdfUrl = sent.body.pdf_url;

    const wo = await request(app.getHttpServer())
      .post('/work-orders')
      .set(auth(A.token))
      .send({ customer_id: customerId, title: 'OS storage UAT' });
    workOrderId = wo.body.id;

    const upload = await request(app.getHttpServer())
      .post(`/work-orders/${workOrderId}/photos`)
      .set(auth(A.token))
      .field('stage', 'BEFORE')
      .attach('file', PNG, 'foto.png')
      .expect(201);
    photoUrl = upload.body.file_url;
  });

  afterAll(async () => {
    await cleanupDatabase();
    await app.close();
  });

  // ─── AUTHENTICATED FLOW ────────────────────────────────────────────────

  it('owner can open the quote PDF via a resolved signed URL', async () => {
    expect(pdfUrl).toContain('X-Amz-Signature');
    const res = await fetch(pdfUrl);
    expect(res.status).toBe(200);
    expect(Buffer.from(await res.arrayBuffer())).toEqual(Buffer.from('%PDF-fake-quote'));
  });

  it('owner can open the work-order photo via a resolved signed URL', async () => {
    expect(photoUrl).toContain('X-Amz-Signature');
    const res = await fetch(photoUrl);
    expect(res.status).toBe(200);
    expect(Buffer.from(await res.arrayBuffer())).toEqual(PNG);
  });

  it('re-fetching GET /quotes/:id issues a fresh usable signed URL', async () => {
    const res = await request(app.getHttpServer())
      .get(`/quotes/${quoteId}`)
      .set(auth(A.token))
      .expect(200);
    const fresh = await fetch(res.body.pdf_url);
    expect(fresh.status).toBe(200);
  });

  // ─── NEGATIVE FLOW ─────────────────────────────────────────────────────

  it('anonymous direct bucket access to the same object is denied', async () => {
    const bucketUrl = new URL(pdfUrl);
    const res = await fetch(`${bucketUrl.origin}${bucketUrl.pathname}`); // strip query (signature)
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it('a tampered signed URL (mutated signature) is denied', async () => {
    const tampered = pdfUrl.replace(/X-Amz-Signature=[^&]+/, 'X-Amz-Signature=deadbeef');
    const res = await fetch(tampered);
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it('an invalid/garbage signed URL is denied', async () => {
    const base = new URL(pdfUrl);
    const res = await fetch(`${base.origin}${base.pathname}?X-Amz-Signature=not-a-real-signature`);
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it('cross-tenant: B cannot reach A quote (so never gets a pdf_url to sign)', () =>
    request(app.getHttpServer()).get(`/quotes/${quoteId}`).set(auth(B.token)).expect(404));

  it('cross-tenant: B cannot reach A work-order photos', () =>
    request(app.getHttpServer())
      .get(`/work-orders/${workOrderId}/photos`)
      .set(auth(B.token))
      .expect(404));
});
