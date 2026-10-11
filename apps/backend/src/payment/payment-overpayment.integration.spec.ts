import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import { assertEphemeralDatabase } from '../../test/ephemeral-db-guard';
import { AuditService } from '../audit/audit.service';
import { TenantOwnershipService } from '../common/tenant/tenant-ownership.service';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentService } from './payment.service';

assertEphemeralDatabase();

describe('Payment overpayment confirmation (real disposable DB)', () => {
  const prisma = new PrismaClient({
    datasources: { db: { url: process.env['DATABASE_URL_TEST'] } },
  });
  const db = prisma as PrismaService;
  const audit = new AuditService();
  const ownership = new TenantOwnershipService(db);
  const service = new PaymentService(db, ownership, audit, {} as never, {} as never, {} as never);
  const fixtureIds: string[] = [];

  async function fixture(label: string) {
    const user = await prisma.user.create({
      data: {
        email: `${label}-${randomUUID()}@example.invalid`,
        name: `Fixture ${label}`,
        password_hash: 'fixture-only',
        accepted_terms_at: new Date(),
      },
    });
    const company = await prisma.company.create({
      data: {
        trade_name: `Fixture ${label}`,
        members: { create: { user_id: user.id, role: 'OWNER', active: true } },
      },
    });
    const customer = await prisma.customer.create({
      data: { company_id: company.id, name: `Cliente ${label}` },
    });
    const payment = await prisma.payment.create({
      data: {
        company_id: company.id,
        customer_id: customer.id,
        amount: '250.00',
        expected_amount: '250.00',
        status: 'PENDING',
      },
    });
    fixtureIds.push(company.id, user.id);
    return { user, company, payment };
  }

  afterEach(async () => {
    const companyIds = fixtureIds.filter((_, index) => index % 2 === 0);
    const userIds = fixtureIds.filter((_, index) => index % 2 === 1);
    fixtureIds.length = 0;
    await prisma.auditLog.deleteMany({ where: { company_id: { in: companyIds } } });
    await prisma.payment.deleteMany({ where: { company_id: { in: companyIds } } });
    await prisma.customer.deleteMany({ where: { company_id: { in: companyIds } } });
    await prisma.companyMember.deleteMany({ where: { company_id: { in: companyIds } } });
    await prisma.company.deleteMany({ where: { id: { in: companyIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  });

  afterAll(async () => prisma.$disconnect());

  it('isolates tenants and persists the confirmed excess with its audit reason', async () => {
    const first = await fixture('A');
    const second = await fixture('B');

    await expect(
      service.settle(
        first.payment.id,
        second.company.id,
        { received_amount: '275.00', overpayment_confirmed: true },
        second.user.id,
      ),
    ).rejects.toMatchObject({ status: 404 });

    await service.settle(
      first.payment.id,
      first.company.id,
      {
        received_amount: '275.00',
        method: 'PIX',
        overpayment_confirmed: true,
        overpayment_reason: 'Cliente incluiu uma gorjeta',
      },
      first.user.id,
    );

    const persisted = await prisma.payment.findUniqueOrThrow({ where: { id: first.payment.id } });
    expect({
      ...persisted,
      expected_amount: persisted.expected_amount?.toString(),
      amount: persisted.amount.toString(),
      overpayment_amount: persisted.overpayment_amount?.toString(),
    }).toMatchObject({
      company_id: first.company.id,
      expected_amount: '250',
      amount: '275',
      overpayment_amount: '25',
      overpayment_reason: 'Cliente incluiu uma gorjeta',
      status: 'PAID',
    });
    const auditRow = await prisma.auditLog.findFirstOrThrow({
      where: { company_id: first.company.id, entity_id: first.payment.id },
    });
    expect(auditRow.metadata).toMatchObject({
      reason: 'Cliente incluiu uma gorjeta',
      to: 'PAID',
    });
  });
});
