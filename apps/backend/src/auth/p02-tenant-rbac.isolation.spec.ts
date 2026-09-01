// P02-T08/T09 — Tenant isolation + RBAC (ADR-014). Two real tenants A/B.
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
import { cleanupDatabase, getTestApp } from '../../test/setup';
import { addMember, createCustomer, createTenant, TestTenant } from '../../test/tenant-factory';

describe('P02 — Tenant isolation + RBAC', () => {
  let app: INestApplication;
  let A: TestTenant; // owner of company A
  let B: TestTenant; // owner of company B
  let techA: TestTenant; // TECNICO in company A
  let adminA: TestTenant; // ADMIN in company A

  // resources owned by B
  let customerB: string;
  let catalogB: string;
  let quoteB: string;
  let workOrderB: string;
  let approvalTokenB: string;

  const auth = (t: string) => ({ Authorization: `Bearer ${t}` });

  beforeAll(async () => {
    app = await getTestApp();
    A = await createTenant(app, 'A');
    B = await createTenant(app, 'B');
    techA = await addMember(app, A.token, 'TECNICO');
    adminA = await addMember(app, A.token, 'ADMIN');

    customerB = await createCustomer(app, B.token, 'Cliente B');

    const cat = await request(app.getHttpServer())
      .post('/catalog')
      .set(auth(B.token))
      .send({ name: 'Serviço B', type: 'SERVICE', unit_price: '100.00' });
    catalogB = cat.body.id;

    const quote = await request(app.getHttpServer())
      .post('/quotes')
      .set(auth(B.token))
      .send({
        customer_id: customerB,
        items: [{ description: 'x', quantity: '1', unit_price: '100.00' }],
      });
    quoteB = quote.body.id;

    const send = await request(app.getHttpServer())
      .post(`/quotes/${quoteB}/send`)
      .set(auth(B.token))
      .expect(200);
    approvalTokenB = send.body.approval_token;

    const wo = await request(app.getHttpServer())
      .post('/work-orders')
      .set(auth(B.token))
      .send({ customer_id: customerB, title: 'OS B' });
    workOrderB = wo.body.id;
  });

  afterAll(async () => {
    await cleanupDatabase();
    await app.close();
  });

  // ─── T08: cross-tenant read / list / detail / update / delete ──────────────

  describe('T08 — A cannot observe or mutate B resources', () => {
    it('list: GET /customers as A excludes B rows', async () => {
      const res = await request(app.getHttpServer())
        .get('/customers')
        .set(auth(A.token))
        .expect(200);
      expect(res.body.data).toEqual([]);
    });

    it('detail: GET /customers/:idB as A => 404', () =>
      request(app.getHttpServer()).get(`/customers/${customerB}`).set(auth(A.token)).expect(404));

    it('detail: GET /quotes/:idB as A => 404', () =>
      request(app.getHttpServer()).get(`/quotes/${quoteB}`).set(auth(A.token)).expect(404));

    it('detail: GET /work-orders/:idB as A => 404', () =>
      request(app.getHttpServer())
        .get(`/work-orders/${workOrderB}`)
        .set(auth(A.token))
        .expect(404));

    it('detail: GET /catalog/:idB as A => 404', () =>
      request(app.getHttpServer()).get(`/catalog/${catalogB}`).set(auth(A.token)).expect(404));

    it('update: PATCH /catalog/:idB as A => 404', () =>
      request(app.getHttpServer())
        .patch(`/catalog/${catalogB}`)
        .set(auth(A.token))
        .send({ name: 'hijack' })
        .expect(404));

    it('update: PATCH /work-orders/:idB as A => 404', () =>
      request(app.getHttpServer())
        .patch(`/work-orders/${workOrderB}`)
        .set(auth(A.token))
        .send({ title: 'hijack' })
        .expect(404));

    it('mutate: POST /quotes/:idB/send as A => 404', () =>
      request(app.getHttpServer()).post(`/quotes/${quoteB}/send`).set(auth(A.token)).expect(404));

    it('mutate: PATCH /quotes/:idB/cancel as A => 404', () =>
      request(app.getHttpServer())
        .patch(`/quotes/${quoteB}/cancel`)
        .set(auth(A.token))
        .send({})
        .expect(404));

    it('delete: DELETE /catalog/:idB as A => 404', () =>
      request(app.getHttpServer()).delete(`/catalog/${catalogB}`).set(auth(A.token)).expect(404));

    it('nested: GET /work-orders/:idB/photos as A => 404', () =>
      request(app.getHttpServer())
        .get(`/work-orders/${workOrderB}/photos`)
        .set(auth(A.token))
        .expect(404));
  });

  // ─── T08: cross-tenant related IDs (ownership, R-TEN-01) ───────────────────

  describe('T08 — A cannot reference B resources in its own writes', () => {
    let customerA: string;
    beforeAll(async () => {
      customerA = await createCustomer(app, A.token, 'Cliente A');
    });

    it("quote.create with B's customer_id => 404", () =>
      request(app.getHttpServer())
        .post('/quotes')
        .set(auth(A.token))
        .send({
          customer_id: customerB,
          items: [{ description: 'x', quantity: '1', unit_price: '1.00' }],
        })
        .expect(404));

    it("quote.create with B's catalog_item_id => 404", () =>
      request(app.getHttpServer())
        .post('/quotes')
        .set(auth(A.token))
        .send({
          customer_id: customerA,
          items: [
            { catalog_item_id: catalogB, description: 'x', quantity: '1', unit_price: '1.00' },
          ],
        })
        .expect(404));

    it("work-order.create with B's customer_id => 404", () =>
      request(app.getHttpServer())
        .post('/work-orders')
        .set(auth(A.token))
        .send({ customer_id: customerB, title: 'x' })
        .expect(404));

    it("work-order.create with B's assigned_to_user_id => 404", () =>
      request(app.getHttpServer())
        .post('/work-orders')
        .set(auth(A.token))
        .send({ customer_id: customerA, title: 'x', assigned_to_user_id: B.userId })
        .expect(404));

    it("payment.create with B's work_order_id => 404", () =>
      request(app.getHttpServer())
        .post('/payments')
        .set(auth(adminA.token))
        .send({ customer_id: customerA, work_order_id: workOrderB, amount: '10.00' })
        .expect(404));

    it("appointment.create with B's work_order_id => 404", () =>
      request(app.getHttpServer())
        .post('/appointments')
        .set(auth(A.token))
        .send({ title: 'x', starts_at: new Date().toISOString(), work_order_id: workOrderB })
        .expect(404));

    it("customer.create with B's assigned_to_user_id => 404", () =>
      request(app.getHttpServer())
        .post('/customers')
        .set(auth(A.token))
        .send({ name: 'x', assigned_to_user_id: B.userId })
        .expect(404));
  });

  // ─── T08: invites (G-1) ───────────────────────────────────────────────────

  describe('T08 — invites are tenant-scoped (G-1)', () => {
    let inviteBId: string;
    let inviteBToken: string;
    beforeAll(async () => {
      const inv = await request(app.getHttpServer())
        .post('/invites')
        .set(auth(B.token))
        .send({ email: `pending.${Date.now()}@x.test`, role: 'TECNICO' });
      inviteBId = inv.body.id;
      inviteBToken = inv.body.token;
    });

    it('GET /invites as A does not list B invites', async () => {
      const res = await request(app.getHttpServer()).get('/invites').set(auth(A.token)).expect(200);
      expect((res.body as Array<{ id: string }>).some((i) => i.id === inviteBId)).toBe(false);
    });

    it("DELETE /invites/:idB as A => 404 (cannot revoke B's invite)", () =>
      request(app.getHttpServer()).delete(`/invites/${inviteBId}`).set(auth(A.token)).expect(404));

    it("B's invite is still PENDING after A's revoke attempt", async () => {
      const res = await request(app.getHttpServer()).get('/invites').set(auth(B.token)).expect(200);
      expect(
        (res.body as Array<{ id: string; status: string }>).find((i) => i.id === inviteBId)?.status,
      ).toBe('PENDING');
    });

    it('invite token accept still works for the intended recipient', async () => {
      const accept = await request(app.getHttpServer())
        .post('/invites/accept')
        .send({ token: inviteBToken, name: 'Accepted', password: 'Senha@Teste123' });
      expect(accept.status).toBeLessThan(300);
    });
  });

  // ─── T09: RBAC (G-4) ──────────────────────────────────────────────────────

  describe('T09 — RBAC OWNER/ADMIN/TECNICO', () => {
    it('TECNICO cannot GET /company/members => 403', () =>
      request(app.getHttpServer()).get('/company/members').set(auth(techA.token)).expect(403));

    it('TECNICO cannot PATCH /company/approval-methods => 403', () =>
      request(app.getHttpServer())
        .patch('/company/approval-methods')
        .set(auth(techA.token))
        .send({ methods: ['APPROVE_BUTTON'] })
        .expect(403));

    it('TECNICO cannot POST /invites => 403', () =>
      request(app.getHttpServer())
        .post('/invites')
        .set(auth(techA.token))
        .send({ email: 'x@x.test', role: 'TECNICO' })
        .expect(403));

    it('TECNICO cannot POST /billing/checkout => 403', () =>
      request(app.getHttpServer())
        .post('/billing/checkout')
        .set(auth(techA.token))
        .send({ plan_code: 'SOLO', billing_cycle: 'MONTHLY' })
        .expect(403));

    it('TECNICO cannot POST /payments => 403', () =>
      request(app.getHttpServer())
        .post('/payments')
        .set(auth(techA.token))
        .send({ customer_id: customerB, amount: '1.00' })
        .expect(403));

    it('TECNICO CAN GET /payments (read is open) => 200', () =>
      request(app.getHttpServer()).get('/payments').set(auth(techA.token)).expect(200));

    it('TECNICO CAN create a customer (domain route) => 201', () =>
      request(app.getHttpServer())
        .post('/customers')
        .set(auth(techA.token))
        .send({ name: 'By tech' })
        .expect(201));

    it('ADMIN CAN GET /company/members => 200', () =>
      request(app.getHttpServer()).get('/company/members').set(auth(adminA.token)).expect(200));

    it('OWNER CAN PATCH /company/approval-methods => 200', () =>
      request(app.getHttpServer())
        .patch('/company/approval-methods')
        .set(auth(A.token))
        .send({ methods: ['APPROVE_BUTTON', 'TYPED_NAME'] })
        .expect(200));
  });

  // ─── T09: fail-closed on missing tenant context / bad token ───────────────

  describe('T09 — deny-by-default / fail-closed', () => {
    it('no Authorization header on a tenant route => 401', () =>
      request(app.getHttpServer()).get('/customers').expect(401));

    it('garbage bearer token => 401', () =>
      request(app.getHttpServer())
        .get('/customers')
        .set({ Authorization: 'Bearer not-a-jwt' })
        .expect(401));

    it('public route needs no tenant context => 200', () =>
      request(app.getHttpServer()).get(`/quotes/public/${approvalTokenB}`).expect(200));

    it('health is public => 200', () => request(app.getHttpServer()).get('/health').expect(200));
  });
});
