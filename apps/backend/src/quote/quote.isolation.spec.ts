// Mock @react-pdf/renderer — ESM module incompativel com Jest CommonJS transform
jest.mock('@react-pdf/renderer', () => ({
  renderToBuffer: jest.fn().mockResolvedValue(Buffer.from('PDF_CONTENT')),
  Document: ({ children }: any) => children,
  Page: ({ children }: any) => children,
  View: ({ children }: any) => children,
  Text: ({ children }: any) => children,
  Image: () => null,
  StyleSheet: { create: (s: any) => s },
}));

import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { cleanupDatabase, getTestApp } from '../../test/setup';

// TENANT-QUOTE: empresa A não acessa quotes da empresa B
describe('Quote — Multi-tenant isolation', () => {
  let app: INestApplication;
  let tokenA: string;
  let tokenB: string;
  let quoteBId: string;
  let approvalToken: string;

  beforeAll(async () => {
    app = await getTestApp();

    // Criar Tenant A
    const userA = await request(app.getHttpServer()).post('/auth/signup/user').send({
      name: 'Quote Tenant A',
      email: 'quote-a@isolation.test',
      phone: '11900000011',
      password: 'Senha@123',
      accepted_terms: true,
    });
    const accessA: string = userA.body.access_token;

    await request(app.getHttpServer())
      .post('/auth/signup/company')
      .set('Authorization', `Bearer ${accessA}`)
      .send({
        trade_name: 'Empresa Quote A',
        document_type: 'CPF',
        document: '111.111.111-31',
        phone: '11900000011',
        city: 'São Paulo',
        state: 'SP',
      });

    const loginA = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'quote-a@isolation.test', password: 'Senha@123' });
    tokenA = loginA.body.access_token;

    // Criar Tenant B
    const userB = await request(app.getHttpServer()).post('/auth/signup/user').send({
      name: 'Quote Tenant B',
      email: 'quote-b@isolation.test',
      phone: '11900000012',
      password: 'Senha@456',
      accepted_terms: true,
    });
    const accessB: string = userB.body.access_token;

    await request(app.getHttpServer())
      .post('/auth/signup/company')
      .set('Authorization', `Bearer ${accessB}`)
      .send({
        trade_name: 'Empresa Quote B',
        document_type: 'CPF',
        document: '222.222.222-32',
        phone: '11900000012',
        city: 'Rio de Janeiro',
        state: 'RJ',
      });

    const loginB = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'quote-b@isolation.test', password: 'Senha@456' });
    tokenB = loginB.body.access_token;

    // Criar customer na Empresa B
    const customerRes = await request(app.getHttpServer())
      .post('/customers')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({
        name: 'Cliente Quote B',
        phone: '11900000099',
        customer_type: 'INDIVIDUAL',
      });
    const customerBId: string = customerRes.body.id;

    // Criar Quote para Tenant B
    const quoteRes = await request(app.getHttpServer())
      .post('/quotes')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({
        customer_id: customerBId,
        title: 'Orçamento B',
        discount_type: 'PERCENT',
        discount_value: '0',
        items: [{ description: 'Serviço B', quantity: '1', unit_price: '100.00' }],
      });
    quoteBId = quoteRes.body.id;

    // Enviar quote de B para obter approval_token
    const sendRes = await request(app.getHttpServer())
      .post(`/quotes/${quoteBId}/send`)
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(200);
    approvalToken = sendRes.body.approval_token;
  });

  afterAll(async () => {
    await cleanupDatabase();
    await app.close();
  });

  it('empresa A não lista quotes da empresa B (GET /quotes retorna data=[])', async () => {
    const res = await request(app.getHttpServer())
      .get('/quotes')
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);

    expect(res.body.data).toEqual([]);
  });

  it('GET /quotes/:idDeB como empresa A retorna 404', async () => {
    await request(app.getHttpServer())
      .get(`/quotes/${quoteBId}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(404);
  });

  it('POST /quotes/:idDeB/send como empresa A retorna 404', async () => {
    await request(app.getHttpServer())
      .post(`/quotes/${quoteBId}/send`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(404);
  });

  it('GET /quotes/public/:token retorna 200 sem Authorization header', async () => {
    const res = await request(app.getHttpServer())
      .get(`/quotes/public/${approvalToken}`)
      .expect(200);

    expect(res.body).toMatchObject({
      status: 'SENT',
      total: expect.any(String),
    });
  });
});
