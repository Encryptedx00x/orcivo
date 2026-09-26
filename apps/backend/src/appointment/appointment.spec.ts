import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { AppointmentService } from './appointment.service';
import { AppointmentUpdateSchema } from './appointment.dto';
import { AppointmentController } from './appointment.controller';
import { ZodValidationPipe } from '../common/zod-validation.pipe';

jest.mock('../prisma/prisma.service', () => ({ PrismaService: class {} }));
jest.mock('../common/tenant/tenant-ownership.service', () => ({
  TenantOwnershipService: class {},
}));
jest.mock('../audit/audit.service', () => ({ AuditService: class {} }));

const original = () => ({
  id: 'appointment',
  company_id: 'company',
  title: 'Visita',
  type: 'VISITA',
  customer_id: null,
  work_order_id: null,
  notes: 'Original',
  customer: null,
  starts_at: new Date('2026-09-26T12:00:00Z'),
  ends_at: new Date('2026-09-26T13:00:00Z'),
  updated_at: new Date('2026-09-25T00:00:00Z'),
});

describe('appointment update contract', () => {
  it('routes a validated partial body with the authenticated company and user', () => {
    const update = jest.fn();
    const controller = new AppointmentController({ update } as never);
    const body = new ZodValidationPipe(AppointmentUpdateSchema).transform({ title: ' Changed ' });
    controller.update(
      'appointment',
      { companyId: 'company', user: { userId: 'user' } },
      body as never,
    );
    expect(update).toHaveBeenCalledWith('appointment', { title: 'Changed' }, 'company', 'user');
  });

  it.each([
    {},
    { title: '  ' },
    { title: null },
    { type: 'INVALID' },
    { starts_at: 'invalid' },
    { starts_at: null },
    { customer_id: 'invalid' },
    { company_id: 'other', title: 'Changed' },
    { notes: 'a'.repeat(501) },
  ])('rejects invalid or protected input %j', (input) => {
    expect(AppointmentUpdateSchema.safeParse(input).success).toBe(false);
  });

  it('accepts partial updates and explicit optional clears', () => {
    expect(
      AppointmentUpdateSchema.parse({ title: ' Changed ', ends_at: null, customer_id: null }),
    ).toEqual({ title: 'Changed', ends_at: null, customer_id: null });
  });
});

describe('appointment mutations', () => {
  function setup() {
    let row: ReturnType<typeof original> | null = original();
    const logs: unknown[] = [];
    const matches = (where: { id: string; company_id: string }) =>
      row && row.id === where.id && row.company_id === where.company_id;
    const tx = {
      appointment: {
        findFirst: jest.fn(async ({ where }) => (matches(where) ? { ...row } : null)),
        findFirstOrThrow: jest.fn(async () => ({ ...row })),
        updateMany: jest.fn(async ({ where, data }) => {
          if (!matches(where)) return { count: 0 };
          row = {
            ...row!,
            ...Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined)),
          };
          return { count: 1 };
        }),
        deleteMany: jest.fn(async ({ where }) => {
          if (!matches(where)) return { count: 0 };
          row = null;
          return { count: 1 };
        }),
      },
    };
    const prisma = {
      $transaction: jest.fn(async (callback) => {
        const before = row ? { ...row } : null;
        const count = logs.length;
        try {
          return await callback(tx);
        } catch (error) {
          row = before;
          logs.length = count;
          throw error;
        }
      }),
    };
    const ownership = { assertCustomer: jest.fn(), assertWorkOrder: jest.fn() };
    const audit = {
      record: jest.fn(async (_tx, input) => {
        logs.push(input);
      }),
    };
    const service = new AppointmentService(prisma as never, ownership as never, audit as never);
    return { service, tx, ownership, audit, logs, getRow: () => row };
  }

  it('preserves omitted fields, scopes writes, and audits before/after in the transaction', async () => {
    const s = setup();
    const result = await s.service.update('appointment', { title: 'Changed' }, 'company', 'user');
    expect(result).toMatchObject({
      title: 'Changed',
      notes: 'Original',
      starts_at: original().starts_at,
    });
    expect(s.tx.appointment.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'appointment', company_id: 'company', updated_at: original().updated_at },
      }),
    );
    expect(s.audit.record).toHaveBeenCalledTimes(1);
    expect(s.audit.record).toHaveBeenCalledWith(
      s.tx,
      expect.objectContaining({
        action: 'appointment.updated',
        companyId: 'company',
        actorUserId: 'user',
        from: expect.objectContaining({ title: 'Visita' }),
        to: expect.objectContaining({ title: 'Changed' }),
      }),
    );
  });

  it.each(['missing', 'other-company'])(
    'rejects absent or foreign appointments (%s)',
    async (scenario) => {
      const s = setup();
      await expect(
        s.service.update(
          scenario === 'missing' ? 'missing' : 'appointment',
          { title: 'Changed' },
          scenario === 'missing' ? 'company' : 'foreign',
          'user',
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(s.tx.appointment.updateMany).not.toHaveBeenCalled();
      expect(s.logs).toHaveLength(0);
    },
  );

  it.each([{ starts_at: '2026-09-26T14:00:00Z' }, { ends_at: '2026-09-26T11:00:00Z' }])(
    'validates the merged interval for a one-sided change',
    async (dto) => {
      const s = setup();
      await expect(s.service.update('appointment', dto, 'company', 'user')).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(s.tx.appointment.updateMany).not.toHaveBeenCalled();
      expect(s.logs).toHaveLength(0);
    },
  );

  it('clears optional values explicitly and permits rescheduling without an end', async () => {
    const s = setup();
    const result = await s.service.update(
      'appointment',
      {
        starts_at: '2026-09-27T12:00:00Z',
        ends_at: null,
        notes: null,
        customer_id: null,
        work_order_id: null,
      },
      'company',
      'user',
    );
    expect(result).toMatchObject({
      ends_at: null,
      notes: null,
      customer_id: null,
      work_order_id: null,
    });
  });

  it.each(['assertCustomer', 'assertWorkOrder'] as const)(
    'checks related tenant ownership: %s',
    async (method) => {
      const s = setup();
      s.ownership[method].mockRejectedValue(new NotFoundException());
      await expect(
        s.service.update(
          'appointment',
          { customer_id: 'customer', work_order_id: 'order' },
          'company',
          'user',
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(s.ownership[method]).toHaveBeenCalledWith(
        method === 'assertCustomer' ? 'customer' : 'order',
        'company',
      );
      expect(s.tx.appointment.updateMany).not.toHaveBeenCalled();
    },
  );

  it('rejects a concurrent write without audit', async () => {
    const s = setup();
    s.tx.appointment.updateMany.mockResolvedValue({ count: 0 });
    await expect(
      s.service.update('appointment', { title: 'Changed' }, 'company', 'user'),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(s.logs).toHaveLength(0);
  });

  it.each(['update', 'remove'] as const)(
    'propagates audit failure so %s rolls back',
    async (method) => {
      const s = setup();
      s.audit.record.mockRejectedValue(new Error('audit unavailable'));
      const operation =
        method === 'update'
          ? s.service.update('appointment', { title: 'Changed' }, 'company', 'user')
          : s.service.remove('appointment', 'company', 'user');
      await expect(operation).rejects.toThrow('audit unavailable');
      expect(s.getRow()).toEqual(original());
      expect(s.logs).toHaveLength(0);
    },
  );

  it('deletes with a tenant predicate and one audit; rejects repeat deletion', async () => {
    const s = setup();
    await expect(s.service.remove('appointment', 'company', 'user')).resolves.toEqual({ ok: true });
    expect(s.tx.appointment.deleteMany).toHaveBeenCalledWith({
      where: { id: 'appointment', company_id: 'company' },
    });
    expect(s.audit.record).toHaveBeenCalledWith(
      s.tx,
      expect.objectContaining({ action: 'appointment.deleted', actorUserId: 'user' }),
    );
    await expect(s.service.remove('appointment', 'company', 'user')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(s.logs).toHaveLength(1);
  });

  it('does not delete another tenant appointment', async () => {
    const s = setup();
    await expect(s.service.remove('appointment', 'foreign', 'user')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(s.tx.appointment.deleteMany).not.toHaveBeenCalled();
    expect(s.logs).toHaveLength(0);
  });
});
