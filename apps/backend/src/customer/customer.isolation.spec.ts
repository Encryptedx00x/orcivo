import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { cleanupDatabase, getTestApp } from '../../test/setup';

// TENANT-02: empresa A não acessa dados da empresa B
describe('Customer — Multi-tenant isolation (TENANT-02)', () => {
  let app: INestApplication;
  let tokenA: string;
  let tokenB: string;
  let customerBId: string;

  beforeAll(async () => {
    app = await getTestApp();

    // Criar Tenant A
    const userA = await request(app.getHttpServer()).post('/auth/signup/user').send({
      name: 'Tenant A',
      email: 'a@isolation.test',
      phone: '11900000001',
      password: 'Senha@123',
      accepted_terms: true,
    });
    const accessA: string = userA.body.access_token;

    await request(app.getHttpServer())
      .post('/auth/signup/company')
      .set('Authorization', `Bearer ${accessA}`)
      .send({
        trade_name: 'Empresa A',
        document_type: 'CPF',
        document: '111.111.111-11',
        phone: '11900000001',
        city: 'São Paulo',
        state: 'SP',
      });

    const loginA = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'a@isolation.test', password: 'Senha@123' });
    tokenA = loginA.body.access_token;

    // Criar Tenant B
    const userB = await request(app.getHttpServer()).post('/auth/signup/user').send({
      name: 'Tenant B',
      email: 'b@isolation.test',
      phone: '11900000002',
      password: 'Senha@456',
      accepted_terms: true,
    });
    const accessB: string = userB.body.access_token;

    await request(app.getHttpServer())
      .post('/auth/signup/company')
      .set('Authorization', `Bearer ${accessB}`)
      .send({
        trade_name: 'Empresa B',
        document_type: 'CPF',
        document: '222.222.222-22',
        phone: '11900000002',
        city: 'Rio de Janeiro',
        state: 'RJ',
      });

    const loginB = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'b@isolation.test', password: 'Senha@456' });
    tokenB = loginB.body.access_token;

    // Criar customer na Empresa B
    const res = await request(app.getHttpServer())
      .post('/customers')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ name: 'Cliente B', phone: '11900000099', customer_type: 'INDIVIDUAL' });
    customerBId = res.body.id;
  });

  afterAll(async () => {
    await cleanupDatabase();
    await app.close();
  });

  it('empresa A não lista customers da empresa B (GET /customers retorna data=[])', async () => {
    const res = await request(app.getHttpServer())
      .get('/customers')
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);

    expect(res.body.data).toEqual([]);
  });

  it('GET /customers/:idDeB como empresa A retorna 404 (não 403)', async () => {
    await request(app.getHttpServer())
      .get(`/customers/${customerBId}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(404);
  });
});
