import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { cleanupDatabase, getTestApp } from '../../test/setup';

describe('CatalogItem inventory-lite', () => {
  let app: INestApplication;
  let token: string;

  beforeAll(async () => {
    app = await getTestApp();
    const signup = await request(app.getHttpServer()).post('/auth/signup/user').send({
      name: 'Inventory Catalog',
      email: 'inventory-catalog@test.local',
      phone: '11900000030',
      password: 'Senha@123',
      accepted_terms: true,
    });

    await request(app.getHttpServer())
      .post('/auth/signup/company')
      .set('Authorization', `Bearer ${signup.body.access_token}`)
      .send({
        trade_name: 'Inventory Catalog',
        document_type: 'CPF',
        document: '555.555.555-55',
        phone: '11900000030',
        city: 'São Paulo',
        state: 'SP',
      })
      .expect(201);

    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'inventory-catalog@test.local', password: 'Senha@123' })
      .expect(200);
    token = login.body.access_token;
  });

  afterAll(async () => {
    await cleanupDatabase();
    await app.close();
  });

  it('stores decimal inventory prices and exposes a low-stock item', async () => {
    const create = await request(app.getHttpServer())
      .post('/catalog')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Câmera de estoque baixo',
        type: 'PRODUCT',
        quantity: 2,
        low_stock_threshold: 2,
        cost_price: '120.50',
        sale_price: '199.90',
      })
      .expect(201);

    expect(create.body).toMatchObject({
      quantity: 2,
      cost_price: '120.5',
      sale_price: '199.9',
      unit_price: '199.9',
      is_low_stock: true,
    });

    const lowStock = await request(app.getHttpServer())
      .get('/catalog/low-stock')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(lowStock.body.map((item: { id: string }) => item.id)).toContain(create.body.id);
  });

  it('creates and updates items through validated JSON and CSV imports', async () => {
    const jsonImport = await request(app.getHttpServer())
      .post('/catalog/import')
      .set('Authorization', `Bearer ${token}`)
      .send({
        items: [
          {
            name: 'Sensor importado',
            type: 'PRODUCT',
            quantity: 1,
            low_stock_threshold: 2,
            cost_price: '10.00',
            sale_price: '25.00',
          },
        ],
      })
      .expect(200);

    expect(jsonImport.body).toMatchObject({ created: 1, updated: 0, total: 1 });
    expect(jsonImport.body.items[0]).toMatchObject({ is_low_stock: true, sale_price: '25' });

    const csvImport = await request(app.getHttpServer())
      .post('/catalog/import')
      .set('Authorization', `Bearer ${token}`)
      .send({
        csv: [
          'name,type,quantity,low_stock_threshold,cost_price,sale_price',
          'Sensor importado,PRODUCT,8,2,11.00,30.00',
          'Cabo importado,PRODUCT,2,2,5.00,12.00',
        ].join('\n'),
      })
      .expect(200);

    expect(csvImport.body).toMatchObject({ created: 1, updated: 1, total: 2 });
    expect(csvImport.body.items[0]).toMatchObject({
      name: 'Sensor importado',
      quantity: 8,
      cost_price: '11',
      sale_price: '30',
      is_low_stock: false,
    });
  });

  it('rejects number money values without creating an item', async () => {
    await request(app.getHttpServer())
      .post('/catalog/import')
      .set('Authorization', `Bearer ${token}`)
      .send({
        items: [{ name: 'Preço inválido', type: 'PRODUCT', quantity: 1, sale_price: 9.99 }],
      })
      .expect(400);
  });
});
