import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { cleanupDatabase, getTestApp } from '../../test/setup';

// TENANT-WO: empresa A não acessa work-orders da empresa B
describe('WorkOrder — Multi-tenant isolation', () => {
  let app: INestApplication;
  let tokenA: string;
  let tokenB: string;
  let workOrderBId: string;

  beforeAll(async () => {
    app = await getTestApp();

    // Criar Tenant A
    const userA = await request(app.getHttpServer()).post('/auth/signup/user').send({
      name: 'WO Tenant A',
      email: 'wo-a@isolation.test',
      phone: '11900000021',
      password: 'Senha@123',
      accepted_terms: true,
    });
    const accessA: string = userA.body.access_token;

    await request(app.getHttpServer())
      .post('/auth/signup/company')
      .set('Authorization', `Bearer ${accessA}`)
      .send({
        trade_name: 'Empresa WO A',
        document_type: 'CPF',
        document: '111.111.111-41',
        phone: '11900000021',
        city: 'São Paulo',
        state: 'SP',
      });

    const loginA = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'wo-a@isolation.test', password: 'Senha@123' });
    tokenA = loginA.body.access_token;

    // Criar Tenant B
    const userB = await request(app.getHttpServer()).post('/auth/signup/user').send({
      name: 'WO Tenant B',
      email: 'wo-b@isolation.test',
      phone: '11900000022',
      password: 'Senha@456',
      accepted_terms: true,
    });
    const accessB: string = userB.body.access_token;

    await request(app.getHttpServer())
      .post('/auth/signup/company')
      .set('Authorization', `Bearer ${accessB}`)
      .send({
        trade_name: 'Empresa WO B',
        document_type: 'CPF',
        document: '222.222.222-42',
        phone: '11900000022',
        city: 'Rio de Janeiro',
        state: 'RJ',
      });

    const loginB = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'wo-b@isolation.test', password: 'Senha@456' });
    tokenB = loginB.body.access_token;

    // Criar customer na Empresa B
    const customerRes = await request(app.getHttpServer())
      .post('/customers')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({
        name: 'Cliente WO B',
        phone: '11900000099',
        customer_type: 'INDIVIDUAL',
      });
    const customerBId: string = customerRes.body.id;

    // Criar WorkOrder para Tenant B
    const woRes = await request(app.getHttpServer())
      .post('/work-orders')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({
        customer_id: customerBId,
        title: 'OS de Tenant B',
      });
    workOrderBId = woRes.body.id;
  });

  afterAll(async () => {
    await cleanupDatabase();
    await app.close();
  });

  it('empresa A não lista work-orders da empresa B (GET /work-orders retorna data=[])', async () => {
    const res = await request(app.getHttpServer())
      .get('/work-orders')
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);

    expect(res.body.data).toEqual([]);
  });

  it('GET /work-orders/:idDeB como empresa A retorna 404', async () => {
    await request(app.getHttpServer())
      .get(`/work-orders/${workOrderBId}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(404);
  });

  it('PATCH /work-orders/:idDeB como empresa A retorna 404', async () => {
    await request(app.getHttpServer())
      .patch(`/work-orders/${workOrderBId}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ status: 'IN_PROGRESS' })
      .expect(404);
  });

  it('POST /work-orders/:idDeB/photos como empresa A retorna 404', async () => {
    await request(app.getHttpServer())
      .post(`/work-orders/${workOrderBId}/photos`)
      .set('Authorization', `Bearer ${tokenA}`)
      .field('stage', 'BEFORE')
      .attach('file', Buffer.from('fake-image-content'), {
        filename: 'test.jpg',
        contentType: 'image/jpeg',
      })
      .expect(404);
  });
});
