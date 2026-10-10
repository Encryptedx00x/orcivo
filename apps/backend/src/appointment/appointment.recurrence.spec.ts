import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { cleanupDatabase, getTestApp } from '../../test/setup';
import { PrismaService } from '../prisma/prisma.service';
import { AppointmentService } from './appointment.service';

describe('Appointment recurrence', () => {
  let app: INestApplication;
  let token: string;
  let prisma: PrismaService;
  let companyId: string;
  let customerId: string;

  beforeAll(async () => {
    app = await getTestApp();
    prisma = app.get(PrismaService);
    const signup = await request(app.getHttpServer()).post('/auth/signup/user').send({
      name: 'Agenda Recorrente',
      email: 'agenda-recorrente@test.local',
      phone: '11900000041',
      password: 'Senha@123',
      accepted_terms: true,
    });
    await request(app.getHttpServer())
      .post('/auth/signup/company')
      .set('Authorization', `Bearer ${signup.body.access_token}`)
      .send({
        trade_name: 'Agenda Recorrente',
        document_type: 'CPF',
        document: '666.666.666-66',
        phone: '11900000041',
        city: 'São Paulo',
        state: 'SP',
      })
      .expect(201);
    companyId = (
      await prisma.company.findFirstOrThrow({ where: { trade_name: 'Agenda Recorrente' } })
    ).id;
    await prisma.company.update({ where: { id: companyId }, data: { plan_code: 'MAIS' } });
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'agenda-recorrente@test.local', password: 'Senha@123' })
      .expect(200);
    token = login.body.access_token;
    const customer = await request(app.getHttpServer())
      .post('/customers')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Cliente Recorrente', type: 'PF', phone: '11900000042' })
      .expect(201);
    customerId = customer.body.id;
  });

  afterAll(async () => {
    await cleanupDatabase();
    await app.close();
  });

  it('gates recurrence to Mais/Equipe and generates tenant-scoped OS + charge once', async () => {
    await prisma.company.update({ where: { id: companyId }, data: { plan_code: 'SOLO' } });
    await request(app.getHttpServer())
      .post('/appointments')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Limpeza semestral',
        customer_id: customerId,
        starts_at: '2026-10-15T12:00:00.000Z',
        recurrence_type: 'CUSTOM_MONTHS',
        recurrence_interval: 6,
        recurrence_amount: '180.00',
      })
      .expect(400);

    await prisma.company.update({ where: { id: companyId }, data: { plan_code: 'MAIS' } });
    const created = await request(app.getHttpServer())
      .post('/appointments')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Limpeza semestral',
        type: 'MANUTENCAO',
        customer_id: customerId,
        starts_at: '2026-10-15T12:00:00.000Z',
        ends_at: '2026-10-15T14:00:00.000Z',
        schedule_period: 'MORNING',
        reminder_minutes: 30,
        recurrence_type: 'CUSTOM_MONTHS',
        recurrence_interval: 6,
        recurrence_amount: '180.00',
      })
      .expect(201);

    const first = await prisma.appointment.findUniqueOrThrow({ where: { id: created.body.id } });
    expect(first.work_order_id).toBeTruthy();
    expect(first.recurrence_next_at?.toISOString()).toBe('2027-04-15T12:00:00.000Z');
    expect(await prisma.payment.count({ where: { company_id: companyId } })).toBe(1);

    await prisma.appointment.update({
      where: { id: first.id },
      data: { recurrence_next_at: new Date(Date.now() - 60_000) },
    });
    const service = app.get(AppointmentService);
    await Promise.all([service.generateRecurringWork(), service.generateRecurringWork()]);

    expect(await prisma.workOrder.count({ where: { company_id: companyId } })).toBe(2);
    expect(await prisma.payment.count({ where: { company_id: companyId } })).toBe(2);
    expect(
      await prisma.auditLog.count({
        where: { company_id: companyId, action: 'appointment.recurrence_generated' },
      }),
    ).toBe(2);
  });
});
