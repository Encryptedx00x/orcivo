import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { cleanupDatabase, getTestApp } from '../../test/setup';

// Costs are tenant data: company A never sees, changes or counts company B's expenses.
describe('Expense — Multi-tenant isolation', () => {
  let app: INestApplication;
  let tokenA: string;
  let tokenB: string;
  let expenseBId: string;

  async function tenant(n: string, doc: string): Promise<string> {
    const user = await request(app.getHttpServer())
      .post('/auth/signup/user')
      .send({
        name: `Tenant ${n}`,
        email: `${n}@expense.test`,
        phone: `1190000010${n === 'a' ? 1 : 2}`,
        password: 'Senha@123',
        accepted_terms: true,
      });
    await request(app.getHttpServer())
      .post('/auth/signup/company')
      .set('Authorization', `Bearer ${user.body.access_token}`)
      .send({
        trade_name: `Empresa ${n}`,
        document_type: 'CPF',
        document: doc,
        phone: '11900000100',
        city: 'São Paulo',
        state: 'SP',
      });
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: `${n}@expense.test`, password: 'Senha@123' });
    return login.body.access_token;
  }

  beforeAll(async () => {
    app = await getTestApp();
    tokenA = await tenant('a', '111.111.111-11');
    tokenB = await tenant('b', '222.222.222-22');
    const res = await request(app.getHttpServer())
      .post('/expenses')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ category: 'COMBUSTIVEL', amount: '80.00', status: 'PAID' })
      .expect(201);
    expenseBId = res.body.id;
  }, 30_000);

  afterAll(async () => {
    await cleanupDatabase();
    await app.close();
  });

  it('A não lista nem soma os custos de B', async () => {
    const list = await request(app.getHttpServer())
      .get('/expenses')
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);
    expect(list.body.data).toEqual([]);
    const from = new Date(Date.now() - 86_400_000).toISOString();
    const to = new Date(Date.now() + 86_400_000).toISOString();
    const sumA = await request(app.getHttpServer())
      .get(`/finance/summary?from=${from}&to=${to}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);
    expect(sumA.body.costs.paid).toBe('0.00');
    const sumB = await request(app.getHttpServer())
      .get(`/finance/summary?from=${from}&to=${to}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(200);
    expect(sumB.body.costs.paid).toBe('80.00');
    expect(sumB.body.result).toBe('-80.00');
  });

  it('A não altera nem exclui custo de B (404)', async () => {
    await request(app.getHttpServer())
      .patch(`/expenses/${expenseBId}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ amount: '1.00' })
      .expect(404);
    await request(app.getHttpServer())
      .delete(`/expenses/${expenseBId}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(404);
  });
});
