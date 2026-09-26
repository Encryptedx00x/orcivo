import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { cleanupDatabase, getTestApp } from '../../test/setup';
import { PrismaService } from '../prisma/prisma.service';

describe('Customer (e2e) (CUSTOMER-01)', () => {
  it.todo('POST /customers cria customer com company_id do tenant atual');
  it.todo('GET /customers retorna apenas customers do tenant atual');
});

// PB1-P14-customer-edit-delete: PATCH /customers/:id + DELETE /customers/:id (soft delete)
describe('Customer edit/delete (PB1-P14)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let token: string;
  let otherToken: string;
  let customerId: string;

  beforeAll(async () => {
    app = await getTestApp();
    prisma = app.get(PrismaService);

    const user = await request(app.getHttpServer()).post('/auth/signup/user').send({
      name: 'Dona da empresa',
      email: 'owner@p14.test',
      phone: '11900000010',
      password: 'Senha@123',
      accepted_terms: true,
    });
    const access: string = user.body.access_token;

    await request(app.getHttpServer())
      .post('/auth/signup/company')
      .set('Authorization', `Bearer ${access}`)
      .send({
        trade_name: 'Empresa P14',
        document_type: 'CPF',
        document: '333.333.333-33',
        phone: '11900000010',
        city: 'São Paulo',
        state: 'SP',
      });

    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'owner@p14.test', password: 'Senha@123' });
    token = login.body.access_token;

    const otherUser = await request(app.getHttpServer()).post('/auth/signup/user').send({
      name: 'Outra empresa',
      email: 'other@p14.test',
      phone: '11900000011',
      password: 'Senha@456',
      accepted_terms: true,
    });
    const otherAccess: string = otherUser.body.access_token;

    await request(app.getHttpServer())
      .post('/auth/signup/company')
      .set('Authorization', `Bearer ${otherAccess}`)
      .send({
        trade_name: 'Empresa Outra',
        document_type: 'CPF',
        document: '444.444.444-44',
        phone: '11900000011',
        city: 'Rio de Janeiro',
        state: 'RJ',
      });

    const otherLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'other@p14.test', password: 'Senha@456' });
    otherToken = otherLogin.body.access_token;
  });

  afterAll(async () => {
    await cleanupDatabase();
    await app.close();
  });

  beforeEach(async () => {
    const res = await request(app.getHttpServer())
      .post('/customers')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Cliente Original', phone: '11900000099' })
      .expect(201);
    customerId = res.body.id;
  });

  it('AC1: PATCH atualiza customer tenant-scoped e reflete no GET', async () => {
    await request(app.getHttpServer())
      .patch(`/customers/${customerId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Cliente Atualizado', city: 'Campinas' })
      .expect(200);

    const getRes = await request(app.getHttpServer())
      .get(`/customers/${customerId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(getRes.body.name).toBe('Cliente Atualizado');
    expect(getRes.body.city).toBe('Campinas');
  });

  it('AC1: PATCH em customer de outro tenant retorna 404 (ownership)', async () => {
    await request(app.getHttpServer())
      .patch(`/customers/${customerId}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ name: 'Invasão' })
      .expect(404);
  });

  it('AC3: PATCH grava audit row', async () => {
    await request(app.getHttpServer())
      .patch(`/customers/${customerId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Cliente Atualizado' })
      .expect(200);

    const audit = await prisma.auditLog.findFirst({
      where: { entity_type: 'customer', entity_id: customerId, action: 'customer.updated' },
    });
    expect(audit).not.toBeNull();
  });

  it('AC2: DELETE faz soft delete — linha permanece no banco com deleted_at preenchido', async () => {
    await request(app.getHttpServer())
      .delete(`/customers/${customerId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const row = await prisma.customer.findUnique({ where: { id: customerId } });
    expect(row).not.toBeNull();
    expect(row?.deleted_at).not.toBeNull();
  });

  it('AC2: cliente excluído some do GET /customers e GET /customers/:id (404)', async () => {
    await request(app.getHttpServer())
      .delete(`/customers/${customerId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    await request(app.getHttpServer())
      .get(`/customers/${customerId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(404);

    const list = await request(app.getHttpServer())
      .get('/customers')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(list.body.data.find((c: { id: string }) => c.id === customerId)).toBeUndefined();
  });

  it('AC3: DELETE grava audit row', async () => {
    await request(app.getHttpServer())
      .delete(`/customers/${customerId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const audit = await prisma.auditLog.findFirst({
      where: { entity_type: 'customer', entity_id: customerId, action: 'customer.deleted' },
    });
    expect(audit).not.toBeNull();
  });

  it('DELETE em customer de outro tenant retorna 404 (ownership)', async () => {
    await request(app.getHttpServer())
      .delete(`/customers/${customerId}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(404);
  });

  it('DELETE de um customer já excluído retorna 404 (não permite excluir duas vezes)', async () => {
    await request(app.getHttpServer())
      .delete(`/customers/${customerId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    await request(app.getHttpServer())
      .delete(`/customers/${customerId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(404);
  });
});
