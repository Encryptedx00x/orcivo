import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { cleanupDatabase, getTestApp } from '../../test/setup';

// TENANT-02: empresa A não acessa dados do catálogo da empresa B
describe('CatalogItem — Multi-tenant isolation (TENANT-02)', () => {
  let app: INestApplication;
  let tokenA: string;
  let tokenB: string;
  let catalogItemBId: string;

  beforeAll(async () => {
    app = await getTestApp();

    // Criar Tenant A
    const userA = await request(app.getHttpServer()).post('/auth/signup/user').send({
      name: 'Tenant A Catalog',
      email: 'a@catalog-isolation.test',
      phone: '11900000011',
      password: 'Senha@123',
      accepted_terms: true,
    });
    const accessA: string = userA.body.access_token;

    await request(app.getHttpServer())
      .post('/auth/signup/company')
      .set('Authorization', `Bearer ${accessA}`)
      .send({
        trade_name: 'Empresa A Catalog',
        document_type: 'CPF',
        document: '333.333.333-33',
        phone: '11900000011',
        city: 'São Paulo',
        state: 'SP',
      });

    const loginA = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'a@catalog-isolation.test', password: 'Senha@123' });
    tokenA = loginA.body.access_token;

    // Criar Tenant B
    const userB = await request(app.getHttpServer()).post('/auth/signup/user').send({
      name: 'Tenant B Catalog',
      email: 'b@catalog-isolation.test',
      phone: '11900000012',
      password: 'Senha@456',
      accepted_terms: true,
    });
    const accessB: string = userB.body.access_token;

    await request(app.getHttpServer())
      .post('/auth/signup/company')
      .set('Authorization', `Bearer ${accessB}`)
      .send({
        trade_name: 'Empresa B Catalog',
        document_type: 'CPF',
        document: '444.444.444-44',
        phone: '11900000012',
        city: 'Rio de Janeiro',
        state: 'RJ',
      });

    const loginB = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'b@catalog-isolation.test', password: 'Senha@456' });
    tokenB = loginB.body.access_token;

    // Criar CatalogItem na Empresa B
    const res = await request(app.getHttpServer())
      .post('/catalog')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ name: 'Serviço B', type: 'SERVICE', unit_price: '150.00' });
    catalogItemBId = res.body.id;
  });

  afterAll(async () => {
    await cleanupDatabase();
    await app.close();
  });

  it('empresa A não lista catalog items da empresa B (GET /catalog retorna [])', async () => {
    const res = await request(app.getHttpServer())
      .get('/catalog')
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);

    expect(res.body).toEqual([]);
  });

  it('GET /catalog/:idDeB com empresa A retorna 404 (não 403)', async () => {
    await request(app.getHttpServer())
      .get(`/catalog/${catalogItemBId}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(404);
  });

  it('PATCH /catalog/:idDeB com empresa A retorna 404 (não 403)', async () => {
    await request(app.getHttpServer())
      .patch(`/catalog/${catalogItemBId}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ name: 'Ataque' })
      .expect(404);
  });

  it('DELETE /catalog/:idDeB com empresa A retorna 404 (não 403)', async () => {
    await request(app.getHttpServer())
      .delete(`/catalog/${catalogItemBId}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(404);
  });
});
