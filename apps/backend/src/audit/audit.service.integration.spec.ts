import { PrismaClient } from '@prisma/client';
import { AuditService } from './audit.service';

/**
 * AC1 — AuditService.record persists a structured row *inside the caller
 * transaction*: it must commit with the mutation and roll back with it.
 *
 * Needs a real ephemeral Postgres (infra/docker-compose.test.yml + `prisma
 * migrate deploy`). Skips itself when DATABASE_URL is not an ephemeral DB.
 */
const dbUrl = process.env['DATABASE_URL_TEST'] ?? process.env['DATABASE_URL'] ?? '';
const canRun =
  /\/orcivo_(test|verify|uat)/i.test(dbUrl) && /@(localhost|127\.0\.0\.1)/i.test(dbUrl);
const maybe = canRun ? describe : describe.skip;

maybe('AuditService (integration)', () => {
  const prisma = new PrismaClient({ datasources: { db: { url: dbUrl } } });
  const audit = new AuditService();
  let companyId: string | undefined;
  let userId: string | undefined;

  beforeAll(async () => {
    await prisma.$connect();
    const user = await prisma.user.create({
      data: {
        email: `audit-int-${Date.now()}@example.com`,
        name: 'Audit Int',
        password_hash: 'x',
        accepted_terms_at: new Date(),
      },
    });
    userId = user.id;
    const company = await prisma.company.create({ data: { trade_name: 'Audit Int Co' } });
    companyId = company.id;
  });

  afterAll(async () => {
    // Guard every delete with a fixture id that was actually captured — if
    // beforeAll threw before assigning these, an undefined `where` filter would
    // make Prisma drop the condition and deleteMany would hit unrelated rows.
    try {
      if (companyId) {
        await prisma.auditLog.deleteMany({ where: { company_id: companyId } });
        await prisma.company.deleteMany({ where: { id: companyId } });
      }
      if (userId) {
        await prisma.user.deleteMany({ where: { id: userId } });
      }
    } finally {
      await prisma.$disconnect();
    }
  });

  afterEach(async () => {
    if (!companyId) return;
    await prisma.auditLog.deleteMany({ where: { company_id: companyId } });
  });

  it('persists a structured row with the standardised {from,to,reason,humanText} envelope', async () => {
    await prisma.$transaction(async (tx) => {
      await audit.record(tx, {
        companyId: companyId!,
        actorType: 'USER',
        actorUserId: userId,
        action: 'quote.approved',
        entityType: 'quote',
        entityId: 'quote-1',
        from: 'SENT',
        to: 'APPROVED',
        reason: 'cliente aprovou',
        humanText: 'Orçamento #12 (Maria Souza) aprovado por João',
      });
    });

    const row = await prisma.auditLog.findFirstOrThrow({ where: { company_id: companyId } });
    expect(row.actor_type).toBe('USER');
    expect(row.actor_user_id).toBe(userId);
    expect(row.action).toBe('quote.approved');
    expect(row.metadata).toEqual({
      from: 'SENT',
      to: 'APPROVED',
      reason: 'cliente aprovou',
      humanText: 'Orçamento #12 (Maria Souza) aprovado por João',
    });
  });

  it('writes NULL actor_user_id for SYSTEM actors', async () => {
    await prisma.$transaction(async (tx) => {
      await audit.record(tx, {
        companyId: companyId!,
        actorType: 'SYSTEM',
        action: 'quote.expired',
        entityType: 'quote',
        entityId: 'quote-2',
        from: 'SENT',
        to: 'EXPIRED',
        humanText: 'Orçamento #13 (Ana) expirou automaticamente',
      });
    });

    const row = await prisma.auditLog.findFirstOrThrow({ where: { company_id: companyId } });
    expect(row.actor_user_id).toBeNull();
    expect(row.actor_type).toBe('SYSTEM');
  });

  it('rolls back the audit row when the surrounding transaction throws (AC1 atomicity)', async () => {
    await expect(
      prisma.$transaction(async (tx) => {
        await audit.record(tx, {
          companyId: companyId!,
          actorType: 'USER',
          actorUserId: userId,
          action: 'quote.cancelled',
          entityType: 'quote',
          entityId: 'quote-3',
          from: 'SENT',
          to: 'CANCELLED',
          humanText: 'Orçamento #14 (Pedro) cancelado',
        });
        throw new Error('caller mutation failed');
      }),
    ).rejects.toThrow('caller mutation failed');

    const count = await prisma.auditLog.count({ where: { company_id: companyId } });
    expect(count).toBe(0);
  });
});
