import { BadRequestException, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { APP_GUARD } from '@nestjs/core';
import request from 'supertest';
import { RoleGuard } from '../auth/guards/role.guard';
import { PrismaService } from '../prisma/prisma.service';
import { AuditReadService } from './audit-read.service';
import { AuditQuerySchema } from './audit-query.dto';
import { AuditModule } from './audit.module';

const entityId = '11111111-1111-4111-8111-111111111111';
const cursorId = '22222222-2222-4222-8222-222222222222';
const query = AuditQuerySchema.parse({ entity_type: 'work_order', entity_id: entityId });
const row = {
  id: cursorId,
  created_at: new Date('2026-09-28T12:34:56Z'),
  actor_type: 'USER',
  actor_user_id: 'actor',
  action: 'work_order.reopened',
  metadata: {
    from: 'DONE',
    to: 'IN_PROGRESS',
    reason: 'Retorno solicitado pelo cliente',
    humanText: 'OS #42 reaberta',
  },
};

describe('Audit read endpoint', () => {
  const prisma = {
    auditLog: { findMany: jest.fn(), findFirst: jest.fn() },
    user: { findMany: jest.fn() },
  };
  let service: AuditReadService;
  let app: INestApplication;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AuditModule],
      providers: [{ provide: APP_GUARD, useClass: RoleGuard }],
    })
      .useMocker((token) => (token === PrismaService ? prisma : undefined))
      .compile();
    service = module.get(AuditReadService);
    app = module.createNestApplication();
    // Model the context supplied by the existing global JWT/Tenant guards.
    app.use(
      (
        req: { role?: string; companyId: string; headers: Record<string, string> },
        _res: unknown,
        next: () => void,
      ) => {
        req.role = req.headers['x-test-role'];
        req.companyId = 'tenant-a';
        next();
      },
    );
    await app.init();
  });
  afterAll(async () => {
    await app.close();
  });
  beforeEach(() => {
    jest.resetAllMocks();
    prisma.auditLog.findMany.mockResolvedValue([row]);
    prisma.user.findMany.mockResolvedValue([{ id: 'actor', name: 'Ana' }]);
  });

  it('registers GET with admin access and preserves date, actor and reopen reason', async () => {
    const response = await request(app.getHttpServer())
      .get('/audit-logs')
      .query(query)
      .set('x-test-role', 'OWNER')
      .expect(200);
    expect(response.headers['cache-control']).toBe('private, no-store');
    expect(response.body.data[0]).toMatchObject({
      actor_name: 'Ana',
      created_at: '2026-09-28T12:34:56.000Z',
      metadata: row.metadata,
    });
    expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { company_id: 'tenant-a', entity_type: 'work_order', entity_id: entityId },
        orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
        take: 21,
      }),
    );
  });

  it.each(['TECHNICIAN', 'FINANCIAL', ''])(
    'denies non-admin role %s before reading',
    async (role) => {
      await request(app.getHttpServer())
        .get('/audit-logs')
        .query(query)
        .set('x-test-role', role)
        .expect(403);
      expect(prisma.auditLog.findMany).not.toHaveBeenCalled();
    },
  );

  it.each([
    {},
    { ...query, entity_id: 'invalid' },
    { ...query, entity_type: 'company' },
    { ...query, limit: 51 },
    { ...query, limit: 0 },
    { ...query, cursor: 'invalid' },
  ])('rejects invalid or unbounded queries %j', async (input) => {
    await request(app.getHttpServer())
      .get('/audit-logs')
      .query(input)
      .set('x-test-role', 'ADMIN')
      .expect(400);
    expect(prisma.auditLog.findMany).not.toHaveBeenCalled();
  });

  it.each(['customer', 'quote', 'payment'] as const)(
    'supports %s with only the authenticated tenant',
    async (entityType) => {
      await request(app.getHttpServer())
        .get('/audit-logs')
        .query({ ...query, entity_type: entityType, company_id: 'tenant-b' })
        .set('x-test-role', 'ADMIN')
        .expect(200);
      expect(prisma.auditLog.findMany.mock.calls[0][0].where).toEqual({
        company_id: 'tenant-a',
        entity_type: entityType,
        entity_id: entityId,
      });
    },
  );

  it('paginates by timestamp and ID without returning the lookahead row', async () => {
    prisma.auditLog.findMany.mockResolvedValue([row, { ...row, id: entityId }]);
    expect(await service.findAll('tenant-a', { ...query, limit: 1 })).toMatchObject({
      data: [{ id: cursorId }],
      next_cursor: cursorId,
    });
    prisma.auditLog.findFirst.mockResolvedValue(row);
    await service.findAll('tenant-a', { ...query, cursor: cursorId });
    expect(prisma.auditLog.findFirst).toHaveBeenCalledWith({
      where: {
        company_id: 'tenant-a',
        entity_type: 'work_order',
        entity_id: entityId,
        id: cursorId,
      },
      select: { id: true, created_at: true },
    });
    expect(prisma.auditLog.findMany.mock.calls[1][0].where.OR).toEqual([
      { created_at: { lt: row.created_at } },
      { created_at: row.created_at, id: { lt: cursorId } },
    ]);
  });

  it('rejects a cursor outside the entity/tenant without fetching rows', async () => {
    prisma.auditLog.findFirst.mockResolvedValue(null);
    await expect(
      service.findAll('tenant-a', { ...query, cursor: cursorId }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.auditLog.findMany).not.toHaveBeenCalled();
  });

  it('keeps legacy, deleted-user and system records readable', async () => {
    prisma.auditLog.findMany.mockResolvedValue([
      { ...row, metadata: null },
      { ...row, id: entityId, actor_type: 'SYSTEM', actor_user_id: null },
    ]);
    prisma.user.findMany.mockResolvedValue([]);
    const result = await service.findAll('tenant-a', query);
    expect(result.data).toHaveLength(2);
    expect(result.data[0]).toMatchObject({ metadata: null, actor_name: null });
    expect(result.data[1]).toMatchObject({ actor_type: 'SYSTEM', actor_name: null });
    expect(result.next_cursor).toBeNull();
  });

  it('returns an empty history without looking up users', async () => {
    prisma.auditLog.findMany.mockResolvedValue([]);
    expect(await service.findAll('tenant-a', query)).toEqual({ data: [], next_cursor: null });
    expect(prisma.user.findMany).not.toHaveBeenCalled();
  });

  it('does not expose an audit write endpoint', async () => {
    await request(app.getHttpServer()).post('/audit-logs').set('x-test-role', 'OWNER').expect(404);
  });
});
