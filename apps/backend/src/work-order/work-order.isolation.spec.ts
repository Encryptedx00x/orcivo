import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { cleanupDatabase, getTestApp } from '../../test/setup';

jest.setTimeout(60_000);

// TENANT-WO: empresa A não acessa work-orders da empresa B
describe('WorkOrder — Multi-tenant isolation', () => {
  let app: INestApplication;
  let tokenA: string;
  let tokenB: string;
  let workOrderBId: string;
  let workOrderAId: string;
  let userAId: string;
  let userBId: string;

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
    userAId = loginA.body.user.id;

    const customerA = await request(app.getHttpServer())
      .post('/customers')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ name: 'Cliente WO A', phone: '11900000098', customer_type: 'INDIVIDUAL' });
    const woA = await request(app.getHttpServer())
      .post('/work-orders')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ customer_id: customerA.body.id, title: 'OS de Tenant A' });
    workOrderAId = woA.body.id;

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
    userBId = loginB.body.user.id;

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
    await app?.close();
  });

  it('empresa A lista somente work-orders da própria empresa', async () => {
    const res = await request(app.getHttpServer())
      .get('/work-orders')
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);

    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].id).toBe(workOrderAId);
  });

  it('lista somente membros atribuíveis da empresa corrente', async () => {
    const res = await request(app.getHttpServer())
      .get('/work-orders/assignable-members')
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);

    expect(res.body).toEqual([{ user_id: userAId, name: 'WO Tenant A' }]);
    expect(res.body).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ user_id: userBId })]),
    );
  });

  it('atribui e remove membro do mesmo tenant, mas rejeita membro de outra empresa', async () => {
    const assigned = await request(app.getHttpServer())
      .patch(`/work-orders/${workOrderAId}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ assigned_to_user_id: userAId })
      .expect(200);
    expect(assigned.body.assigned_to).toEqual({ id: userAId, name: 'WO Tenant A' });

    await request(app.getHttpServer())
      .patch(`/work-orders/${workOrderAId}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ assigned_to_user_id: userBId })
      .expect(404);

    const cleared = await request(app.getHttpServer())
      .patch(`/work-orders/${workOrderAId}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ assigned_to_user_id: null })
      .expect(200);
    expect(cleared.body.assigned_to).toBeNull();
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
