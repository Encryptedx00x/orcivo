jest.mock('./quote-pdf.service', () => ({ QuotePdfService: class {} }));

import { PrismaClient } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'crypto';
import * as argon2 from 'argon2';
import { assertEphemeralDatabase } from '../../test/ephemeral-db-guard';
import { QuoteService } from './quote.service';
import { WorkOrderService } from '../work-order/work-order.service';
import { TenantOwnershipService } from '../common/tenant/tenant-ownership.service';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { AuthService } from '../auth/auth.service';

assertEphemeralDatabase();

describe('Security approval/session transactions (real disposable DB)', () => {
  const prisma = new PrismaClient({
    datasources: { db: { url: process.env['DATABASE_URL_TEST'] } },
  });
  const config = new ConfigService();
  const redis = new RedisService(config);
  const audit = new AuditService();
  const db = prisma as PrismaService;
  const ownership = new TenantOwnershipService(db);
  const limits = { enforceLimit: jest.fn().mockResolvedValue(undefined) };
  const pdf = { generate: jest.fn().mockResolvedValue(Buffer.from('fixture-pdf')) };
  const storage = {
    deleteObject: jest.fn().mockResolvedValue(undefined),
    uploadBuffer: jest.fn(async (_bucket: string, key: string) => key),
    getSignedUrl: jest.fn(async (_bucket: string, key: string) => `https://fixture.invalid/${key}`),
    assertUploadable: jest.fn(),
    inlineImage: jest.fn(async (key: string | null) => key),
  };
  const workOrders = new WorkOrderService(db, redis, limits as never, ownership, audit, {
    resolveUrl: async (_b: string, key: string) => key,
  } as never);
  const quotes = new QuoteService(
    db,
    redis,
    config,
    {} as never,
    storage as never,
    workOrders,
    pdf as never,
    limits as never,
    ownership,
    audit,
    {} as never,
  );
  const auth = new AuthService(db, new JwtService(), config, redis, {} as never, audit);
  let companyId: string;
  let userId: string;
  let customerId: string;
  let quoteId: string;
  let token: string;
  let email: string;

  beforeEach(async () => {
    jest.restoreAllMocks();
    limits.enforceLimit.mockResolvedValue(undefined);
    pdf.generate.mockResolvedValue(Buffer.from('fixture-pdf'));
    email = `security-${randomUUID()}@example.invalid`;
    const user = await prisma.user.create({
      data: {
        email,
        name: 'Security fixture',
        password_hash: await argon2.hash('FixtureOnly123!'),
        accepted_terms_at: new Date(),
      },
    });
    userId = user.id;
    const company = await prisma.company.create({
      data: {
        trade_name: 'Security fixture',
        members: { create: { user_id: userId, role: 'OWNER', active: true } },
      },
    });
    companyId = company.id;
    const customer = await prisma.customer.create({
      data: { company_id: companyId, name: 'Fixture customer' },
    });
    customerId = customer.id;
    token = randomUUID();
    const quote = await prisma.quote.create({
      data: {
        company_id: companyId,
        customer_id: customerId,
        created_by_user_id: userId,
        number: 1,
        status: 'SENT',
        approval_token: token,
        pdf_url: 'fixture-original.pdf',
      },
    });
    quoteId = quote.id;
    await redis.setex(`quote:approval:${token}`, 86_400, quoteId);
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    if (token) await redis.del(`quote:approval:${token}`);
    if (companyId) {
      await prisma.quoteApproval.deleteMany({ where: { company_id: companyId } });
      await prisma.workOrder.deleteMany({ where: { company_id: companyId } });
      await prisma.quote.deleteMany({ where: { company_id: companyId } });
      await prisma.auditLog.deleteMany({ where: { company_id: companyId } });
      await prisma.customer.deleteMany({ where: { company_id: companyId } });
      await prisma.companyMember.deleteMany({ where: { company_id: companyId } });
      await prisma.company.delete({ where: { id: companyId } });
    }
    if (userId) {
      await prisma.refreshToken.deleteMany({ where: { user_id: userId } });
      await prisma.user.delete({ where: { id: userId } });
    }
  });
  afterAll(async () => {
    await redis.onModuleDestroy();
    await prisma.$disconnect();
  });

  const approve = () =>
    quotes.approve(token, { approval_method: 'APPROVE_BUTTON' }, '127.0.0.1', 'fixture');
  async function expectUnchanged() {
    expect(await prisma.quote.findUniqueOrThrow({ where: { id: quoteId } })).toMatchObject({
      status: 'SENT',
      pdf_url: 'fixture-original.pdf',
    });
    expect(await prisma.quoteApproval.count({ where: { quote_id: quoteId } })).toBe(0);
    expect(await prisma.workOrder.count({ where: { quote_id: quoteId } })).toBe(0);
    expect(await prisma.auditLog.count({ where: { company_id: companyId } })).toBe(0);
  }

  it('rolls back approval, work order, PDF reference and both audits on a late audit failure', async () => {
    const record = audit.record.bind(audit);
    jest.spyOn(audit, 'record').mockImplementation(async (tx, input) => {
      if (input.action === 'quote.approved') throw new Error('fixture late audit failure');
      return record(tx, input);
    });
    await expect(approve()).rejects.toThrow('fixture late audit failure');
    await expectUnchanged();
  });

  it('rolls back the quote and approval when work-order validation fails', async () => {
    limits.enforceLimit.mockRejectedValueOnce(new Error('fixture quota exceeded'));
    await expect(approve()).rejects.toThrow('fixture quota exceeded');
    await expectUnchanged();
  });

  it('concurrent approvals create exactly one approval, work order and pair of audits', async () => {
    const outcomes = await Promise.allSettled([approve(), approve()]);
    expect(outcomes.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(await prisma.quoteApproval.count({ where: { quote_id: quoteId } })).toBe(1);
    expect(await prisma.workOrder.count({ where: { quote_id: quoteId } })).toBe(1);
    expect(await prisma.auditLog.count({ where: { company_id: companyId } })).toBe(2);
    expect((await prisma.quote.findUniqueOrThrow({ where: { id: quoteId } })).pdf_url).toContain(
      '/approval-',
    );
  });

  it('rejects a token rotated during external artifact generation', async () => {
    pdf.generate.mockImplementationOnce(async () => {
      await prisma.quote.update({ where: { id: quoteId }, data: { approval_token: randomUUID() } });
      return Buffer.from('fixture-pdf');
    });
    await expect(approve()).rejects.toMatchObject({ status: 409 });
    await expectUnchanged();
  });

  it('rejects expired quotes even before the scheduled expiry job runs', async () => {
    await prisma.quote.update({
      where: { id: quoteId },
      data: { valid_until: new Date(Date.now() - 1000) },
    });
    await expect(approve()).rejects.toMatchObject({ status: 400 });
    await expectUnchanged();
  });

  it('password reset revokes real refresh sessions and only permits the new password', async () => {
    const session = await auth.login({ email, password: 'FixtureOnly123!' });
    const resetToken = randomUUID();
    await redis.setex(`pwd:reset:${resetToken}`, 900, userId);
    await auth.resetPassword({ token: resetToken, new_password: 'FixtureNewOnly456!' });
    await expect(auth.refresh(userId, session.refresh_token)).rejects.toMatchObject({
      status: 401,
    });
    await expect(auth.login({ email, password: 'FixtureOnly123!' })).rejects.toMatchObject({
      status: 401,
    });
    await expect(auth.login({ email, password: 'FixtureNewOnly456!' })).resolves.toHaveProperty(
      'access_token',
    );
    await expect(
      auth.resetPassword({ token: resetToken, new_password: 'FixtureAgain789!' }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it('refresh-authenticated logout revokes the presented session without affecting another browser', async () => {
    const session = await auth.login({ email, password: 'FixtureOnly123!' });
    const other = await auth.login({ email, password: 'FixtureOnly123!' });
    await auth.logoutRefresh(userId, session.refresh_token);
    await expect(auth.refresh(userId, session.refresh_token)).rejects.toMatchObject({
      status: 401,
    });
    await expect(auth.refresh(userId, other.refresh_token)).resolves.toHaveProperty('access_token');
  });

  it('a login checked before a password reset cannot issue a session after the reset', async () => {
    const findMembership = prisma.companyMember.findFirst.bind(prisma.companyMember);
    jest.spyOn(prisma.companyMember, 'findFirst').mockImplementationOnce(
      (args) =>
        (async () => {
          const resetToken = randomUUID();
          await redis.setex(`pwd:reset:${resetToken}`, 900, userId);
          await auth.resetPassword({ token: resetToken, new_password: 'FixtureNewOnly456!' });
          return findMembership(args);
        })() as ReturnType<typeof findMembership>,
    );
    await expect(auth.login({ email, password: 'FixtureOnly123!' })).rejects.toMatchObject({
      status: 401,
    });
    expect(await prisma.refreshToken.count({ where: { user_id: userId, revoked: false } })).toBe(0);
  });

  it('only one concurrent refresh can consume a token', async () => {
    const session = await auth.login({ email, password: 'FixtureOnly123!' });
    const outcomes = await Promise.allSettled([
      auth.refresh(userId, session.refresh_token),
      auth.refresh(userId, session.refresh_token),
    ]);
    expect(outcomes.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(await prisma.refreshToken.count({ where: { user_id: userId, revoked: false } })).toBe(1);
  });

  it('logout using the previous token also revokes its just-rotated successor', async () => {
    const session = await auth.login({ email, password: 'FixtureOnly123!' });
    const rotated = await auth.refresh(userId, session.refresh_token);
    await auth.logoutRefresh(userId, session.refresh_token);
    await expect(auth.refresh(userId, rotated.refresh_token)).rejects.toMatchObject({
      status: 401,
    });
  });
});
