import { Injectable } from '@nestjs/common';
import Decimal from 'decimal.js';
import { CUSTOMER_ORIGIN_LABELS, type DataExportEntity } from '@orcivo/shared-types';
import { AuditService } from '../audit/audit.service';
import { PlanLimitsService } from '../plan-limits/plan-limits.service';
import { PrismaService } from '../prisma/prisma.service';

type CsvValue = string | number | null | undefined | Date;
type CsvRow = Record<string, CsvValue>;

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  PIX: 'Pix',
  DINHEIRO: 'Dinheiro',
  CARTAO: 'Cartão',
  TRANSFERENCIA: 'Transferência',
  BOLETO: 'Boleto',
  OUTRO: 'Outro',
  UNKNOWN: 'Não informado',
};

const decimalSum = (values: Array<{ toString(): string }>) =>
  values.reduce<Decimal>((total, value) => total.plus(value.toString()), new Decimal(0)).toFixed(2);

function csvCell(value: CsvValue): string {
  if (value === null || value === undefined) return '';
  const text = value instanceof Date ? value.toISOString() : String(value);
  return /[;"\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function rowsToCsv(rows: CsvRow[]): Buffer {
  const headers = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  const lines = [
    headers.join(';'),
    ...rows.map((row) => headers.map((key) => csvCell(row[key])).join(';')),
  ];
  return Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from(lines.join('\r\n'), 'utf8')]);
}

function crc32(data: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/** ZIP sem compressão: compatível com navegadores e evita dependência de runtime nova. */
function zipFiles(files: Array<{ name: string; data: Buffer }>): Buffer {
  const locals: Buffer[] = [];
  const central: Buffer[] = [];
  let offset = 0;
  for (const file of files) {
    const name = Buffer.from(file.name, 'utf8');
    const crc = crc32(file.data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(file.data.length, 18);
    local.writeUInt32LE(file.data.length, 22);
    local.writeUInt16LE(name.length, 26);
    const entry = Buffer.concat([local, name, file.data]);
    locals.push(entry);

    const directory = Buffer.alloc(46);
    directory.writeUInt32LE(0x02014b50, 0);
    directory.writeUInt16LE(20, 4);
    directory.writeUInt16LE(20, 6);
    directory.writeUInt32LE(crc, 16);
    directory.writeUInt32LE(file.data.length, 20);
    directory.writeUInt32LE(file.data.length, 24);
    directory.writeUInt16LE(name.length, 28);
    directory.writeUInt32LE(offset, 42);
    central.push(Buffer.concat([directory, name]));
    offset += entry.length;
  }
  const centralBytes = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralBytes.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, centralBytes, end]);
}

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly limits: PlanLimitsService,
    private readonly audit: AuditService,
  ) {}

  async report(companyId: string, from: Date, to: Date) {
    await this.limits.enforceReports(companyId);
    const period = { gte: from, lte: to };
    const base = { company_id: companyId, deleted_at: null };
    const [received, receivable, expenses, customers] = await Promise.all([
      this.prisma.payment.findMany({
        where: { ...base, status: 'PAID', paid_at: period },
        select: { amount: true, method: true, customer: { select: { id: true, name: true } } },
      }),
      this.prisma.payment.findMany({
        where: { ...base, status: { in: ['PENDING', 'PARTIAL', 'OVERDUE'] }, due_date: period },
        select: { amount: true },
      }),
      this.prisma.expense.findMany({
        where: { ...base, status: 'PAID', paid_at: period },
        select: { amount: true },
      }),
      this.prisma.customer.findMany({
        where: { company_id: companyId, deleted_at: null, created_at: period },
        select: { origin: true },
      }),
    ]);
    const byMethod = new Map<string, Decimal>();
    const byCustomer = new Map<string, { name: string; amount: Decimal }>();
    for (const payment of received) {
      const method = payment.method ?? 'UNKNOWN';
      byMethod.set(
        method,
        (byMethod.get(method) ?? new Decimal(0)).plus(payment.amount.toString()),
      );
      const current = byCustomer.get(payment.customer.id);
      byCustomer.set(payment.customer.id, {
        name: payment.customer.name,
        amount: (current?.amount ?? new Decimal(0)).plus(payment.amount.toString()),
      });
    }
    const origins = new Map<string, number>();
    for (const customer of customers) {
      const origin = customer.origin ?? 'UNKNOWN';
      origins.set(origin, (origins.get(origin) ?? 0) + 1);
    }
    const receivedTotal = decimalSum(received.map((payment) => payment.amount));
    const costTotal = decimalSum(expenses.map((expense) => expense.amount));
    return {
      period: { from: from.toISOString(), to: to.toISOString() },
      totals: {
        received: receivedTotal,
        receivable: decimalSum(receivable.map((payment) => payment.amount)),
        costs: costTotal,
        result: new Decimal(receivedTotal).minus(costTotal).toFixed(2),
      },
      by_payment_method: [...byMethod.entries()].map(([method, amount]) => ({
        method,
        label: PAYMENT_METHOD_LABELS[method] ?? method,
        amount: amount.toFixed(2),
      })),
      top_customers: [...byCustomer.entries()]
        .sort(([, a], [, b]) => b.amount.comparedTo(a.amount))
        .slice(0, 5)
        .map(([customer_id, value]) => ({
          customer_id,
          name: value.name,
          amount: value.amount.toFixed(2),
        })),
      customers_by_origin: [...origins.entries()].map(([origin, count]) => ({
        origin,
        label: CUSTOMER_ORIGIN_LABELS[origin] ?? origin,
        count,
      })),
    };
  }

  async exportCsv(companyId: string, entity: DataExportEntity, userId: string) {
    const file = await this.exportFile(companyId, entity);
    await this.recordExport(companyId, userId, [entity]);
    return file;
  }

  async exportZip(companyId: string, userId: string) {
    const entities: DataExportEntity[] = [
      'customers',
      'quotes',
      'work_orders',
      'payments',
      'expenses',
    ];
    const files = await Promise.all(entities.map((entity) => this.exportFile(companyId, entity)));
    await this.recordExport(companyId, userId, entities);
    return {
      filename: 'orcivo-dados.zip',
      contentType: 'application/zip',
      buffer: zipFiles(files.map((file) => ({ name: file.filename, data: file.buffer }))),
    };
  }

  private async recordExport(companyId: string, userId: string, entities: DataExportEntity[]) {
    await this.prisma.$transaction((tx) =>
      this.audit.record(tx, {
        companyId,
        actorType: 'USER',
        actorUserId: userId,
        action: 'data.exported',
        entityType: 'company',
        entityId: companyId,
        humanText: `Exportação de dados: ${entities.join(', ')}`,
      }),
    );
  }

  private async exportFile(companyId: string, entity: DataExportEntity) {
    let rows: CsvRow[];
    switch (entity) {
      case 'customers': {
        const data = await this.prisma.customer.findMany({
          where: { company_id: companyId, deleted_at: null },
          orderBy: { created_at: 'asc' },
        });
        rows = data.map((row) => ({
          ...row,
          birthday: row.birthday,
          created_at: row.created_at,
          updated_at: row.updated_at,
        }));
        break;
      }
      case 'quotes': {
        const data = await this.prisma.quote.findMany({
          where: { company_id: companyId },
          orderBy: { created_at: 'asc' },
          include: { customer: { select: { name: true } } },
        });
        rows = data.map((row) => ({
          id: row.id,
          number: row.number,
          title: row.title,
          status: row.status,
          customer: row.customer.name,
          subtotal: row.subtotal.toString(),
          total: row.total.toString(),
          created_at: row.created_at,
          updated_at: row.updated_at,
        }));
        break;
      }
      case 'work_orders': {
        const data = await this.prisma.workOrder.findMany({
          where: { company_id: companyId },
          orderBy: { created_at: 'asc' },
          include: { customer: { select: { name: true } } },
        });
        rows = data.map((row) => ({
          id: row.id,
          number: row.number,
          title: row.title,
          status: row.status,
          customer: row.customer.name,
          scheduled_at: row.scheduled_at,
          finished_at: row.finished_at,
          created_at: row.created_at,
          updated_at: row.updated_at,
        }));
        break;
      }
      case 'payments': {
        const data = await this.prisma.payment.findMany({
          where: { company_id: companyId, deleted_at: null },
          orderBy: { created_at: 'asc' },
          include: { customer: { select: { name: true } } },
        });
        rows = data.map((row) => ({
          id: row.id,
          customer: row.customer.name,
          description: row.description,
          amount: row.amount.toString(),
          method: row.method,
          status: row.status,
          due_date: row.due_date,
          paid_at: row.paid_at,
          created_at: row.created_at,
        }));
        break;
      }
      case 'expenses': {
        const data = await this.prisma.expense.findMany({
          where: { company_id: companyId, deleted_at: null },
          orderBy: { created_at: 'asc' },
        });
        rows = data.map((row) => ({
          id: row.id,
          category: row.category,
          description: row.description,
          amount: row.amount.toString(),
          method: row.method,
          status: row.status,
          due_date: row.due_date,
          paid_at: row.paid_at,
          created_at: row.created_at,
        }));
        break;
      }
    }
    return {
      filename: `${entity}.csv`,
      contentType: 'text/csv; charset=utf-8',
      buffer: rowsToCsv(rows),
    };
  }
}
