import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PHOTO_BUCKET, StorageService } from '../storage/storage.service';
import { UsersService } from '../users/users.service';
import { ReceiptPdfService } from './receipt-pdf.service';
import { TenantOwnershipService } from '../common/tenant/tenant-ownership.service';
import { AuditService } from '../audit/audit.service';
import { formatMoney } from '@orcivo/shared-types';
import type {
  PaymentCreateDto,
  PaymentDeleteDto,
  PaymentListQueryDto,
  PaymentSettleDto,
  PaymentUpdateDto,
} from './payment.dto';

const customerSelect = { select: { id: true, name: true } };

const METHOD_LABEL: Record<string, string> = {
  PIX: 'Pix',
  DINHEIRO: 'Dinheiro',
  CARTAO: 'Cartão',
  TRANSFERENCIA: 'Transferência',
  BOLETO: 'Boleto',
  OUTRO: 'Outro',
};

type Tx = Prisma.TransactionClient;

/** Payment status as people read it in the activity feed. */
const STATUS_TEXT: Record<string, string> = {
  PENDING: 'a receber',
  PAID: 'recebido',
  OVERDUE: 'atrasado',
  PARTIAL: 'parcial',
  CANCELLED: 'cancelado',
};

@Injectable()
export class PaymentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ownership: TenantOwnershipService,
    private readonly audit: AuditService,
    private readonly storage: StorageService,
    private readonly users: UsersService,
    private readonly receiptPdf: ReceiptPdfService,
  ) {}

  /**
   * Recibo nº: next sequential number for the company, assigned once when the
   * payment becomes PAID. The advisory lock serializes concurrent settles of the
   * same company inside their transactions; the unique index is the backstop.
   */
  private async assignReceiptNumber(tx: Tx, companyId: string, paymentId: string): Promise<void> {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${'receipt:' + companyId}))`;
    const current = await tx.payment.findUnique({
      where: { id: paymentId },
      select: { receipt_number: true, status: true },
    });
    if (!current || current.status !== 'PAID' || current.receipt_number !== null) return;
    const max = await tx.payment.aggregate({
      where: { company_id: companyId },
      _max: { receipt_number: true },
    });
    await tx.payment.update({
      where: { id: paymentId },
      data: { receipt_number: (max._max.receipt_number ?? 0) + 1 },
    });
  }

  /** Adds work order / quote numbers (the payment keeps only their ids). */
  private async withOrigins<T extends { work_order_id: string | null; quote_id: string | null }>(
    companyId: string,
    rows: T[],
  ) {
    const woIds = [...new Set(rows.map((r) => r.work_order_id).filter((v): v is string => !!v))];
    const qIds = [...new Set(rows.map((r) => r.quote_id).filter((v): v is string => !!v))];
    const [wos, qs] = await Promise.all([
      woIds.length
        ? this.prisma.workOrder.findMany({
            where: { id: { in: woIds }, company_id: companyId },
            select: { id: true, number: true, title: true },
          })
        : [],
      qIds.length
        ? this.prisma.quote.findMany({
            where: { id: { in: qIds }, company_id: companyId },
            select: { id: true, number: true, title: true },
          })
        : [],
    ]);
    return rows.map((r) => ({
      ...r,
      work_order: wos.find((w) => w.id === r.work_order_id) ?? null,
      quote: qs.find((q) => q.id === r.quote_id) ?? null,
    }));
  }

  async create(dto: PaymentCreateDto, companyId: string, userId: string) {
    // Every referenced row must belong to the same company (multi-tenant).
    await this.ownership.assertCustomer(dto.customer_id, companyId);
    await this.ownership.assertWorkOrder(dto.work_order_id, companyId);
    await this.ownership.assertQuote(dto.quote_id, companyId);

    const status = dto.status ?? (dto.paid_at ? 'PAID' : 'PENDING');

    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          company_id: companyId,
          customer_id: dto.customer_id,
          work_order_id: dto.work_order_id,
          quote_id: dto.quote_id,
          description: dto.description,
          amount: dto.amount, // Prisma.Decimal aceita string decimal — nunca float
          method: dto.method,
          status,
          due_date: dto.due_date ? new Date(dto.due_date) : undefined,
          paid_at: dto.paid_at ? new Date(dto.paid_at) : status === 'PAID' ? new Date() : undefined,
        },
        include: { customer: customerSelect },
      });
      if (status === 'PAID') await this.assignReceiptNumber(tx, companyId, payment.id);
      await this.audit.record(tx, {
        companyId,
        actorType: 'USER',
        actorUserId: userId,
        action: 'payment.created',
        entityType: 'payment',
        entityId: payment.id,
        from: null,
        to: status,
        humanText:
          `Recebimento de ${formatMoney(payment.amount.toString())} (${payment.customer.name}) ` +
          `registrado como ${status}`,
      });
      return tx.payment.findUniqueOrThrow({
        where: { id: payment.id },
        include: { customer: customerSelect },
      });
    });
  }

  async findAll(companyId: string, query: PaymentListQueryDto) {
    const where = {
      company_id: companyId,
      deleted_at: null,
      ...(query.status ? { status: query.status } : {}),
      ...(query.method ? { method: query.method } : {}),
      ...(query.work_order_id ? { work_order_id: query.work_order_id } : {}),
      ...(query.customer_id ? { customer_id: query.customer_id } : {}),
      ...(query.receipts ? { status: 'PAID' as const, receipt_number: { not: null } } : {}),
    };
    const data = await this.prisma.payment.findMany({
      where,
      orderBy: query.receipts
        ? { receipt_number: 'desc' as const }
        : { created_at: 'desc' as const },
      include: { customer: customerSelect },
      take: 500,
    });
    return { data: await this.withOrigins(companyId, data) };
  }

  async findOne(id: string, companyId: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { id, company_id: companyId, deleted_at: null },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            phone: true,
            tax_id: true,
            street: true,
            number: true,
            neighborhood: true,
            city: true,
            state: true,
          },
        },
      },
    });
    if (!payment) throw new NotFoundException('Recebimento não encontrado');
    const [withOrigin] = await this.withOrigins(companyId, [payment]);
    const receipt_signature_url = payment.receipt_signature_key
      ? await this.storage
          .getSignedUrl(PHOTO_BUCKET, payment.receipt_signature_key)
          .catch(() => null)
      : null;
    return { ...withOrigin, receipt_signature_url };
  }

  /** "Referente a": description, origin, or a generic fallback. */
  private receiptReference(p: {
    description: string | null;
    work_order: { number: number } | null;
    quote: { number: number } | null;
  }): string {
    const origin = p.work_order
      ? `Serviço #${p.work_order.number}`
      : p.quote
        ? `Orçamento #${p.quote.number}`
        : null;
    if (p.description && origin) return `${p.description} (${origin})`;
    return p.description || origin || 'serviços prestados';
  }

  async receiptPdfBuffer(
    id: string,
    companyId: string,
  ): Promise<{ buffer: Buffer; number: number }> {
    const p = await this.findOne(id, companyId);
    if (p.status !== 'PAID' || p.receipt_number === null) {
      throw new NotFoundException('Este recebimento ainda não foi pago, então não tem recibo.');
    }
    const row = await this.prisma.company.findUniqueOrThrow({ where: { id: companyId } });
    const company = { ...row, logo_url: await this.storage.inlineImage(row.logo_url) };
    let signatureDataUri: string | null = null;
    if (p.receipt_signature_key) {
      try {
        const buf = await this.storage.getObjectBuffer(PHOTO_BUCKET, p.receipt_signature_key);
        signatureDataUri = toDataUri(buf);
      } catch {
        signatureDataUri = null;
      }
    }
    const buffer = await this.receiptPdf.generate(
      {
        number: p.receipt_number,
        amount: p.amount.toString(),
        client: p.customer.name,
        clientDetails: {
          document: p.customer.tax_id,
          phone: p.customer.phone,
          address: [
            [p.customer.street, p.customer.number].filter(Boolean).join(', '),
            p.customer.neighborhood,
            [p.customer.city, p.customer.state].filter(Boolean).join('/'),
          ]
            .filter(Boolean)
            .join(' · '),
        },
        reference: this.receiptReference(p),
        method: METHOD_LABEL[p.method ?? ''] ?? 'Não informado',
        paidAt: p.paid_at ?? p.updated_at,
        signatureDataUri,
        signerName: p.receipt_signer_name,
      },
      company,
    );
    return { buffer, number: p.receipt_number };
  }

  /**
   * Applies (freezes a copy of) the caller's saved signature on the receipt, or
   * removes it. Changing the saved signature later does not alter this receipt.
   */
  async setReceiptSignature(id: string, companyId: string, userId: string, apply: boolean) {
    const p = await this.findOne(id, companyId);
    if (p.status !== 'PAID' || p.receipt_number === null) {
      throw new NotFoundException('Este recebimento ainda não foi pago, então não tem recibo.');
    }
    let key: string | null = null;
    let signer: string | null = null;
    if (apply) {
      const buf = await this.users.getSignatureBuffer(companyId, userId);
      if (!buf) throw new NotFoundException('Você ainda não tem assinatura salva.');
      key = `${companyId}/payments/${id}/receipt-signature`;
      await this.storage.uploadBuffer(PHOTO_BUCKET, key, buf, imageMime(buf));
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { name: true },
      });
      signer = user?.name ?? null;
    }
    await this.prisma.payment.update({
      where: { id },
      data: { receipt_signature_key: key, receipt_signer_name: signer },
    });
    return this.findOne(id, companyId);
  }

  async settle(id: string, companyId: string, dto: PaymentSettleDto, userId: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { id, company_id: companyId, deleted_at: null },
      select: { id: true, method: true, status: true, amount: true, customer: customerSelect },
    });
    if (!payment) throw new NotFoundException('Recebimento não encontrado');

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.payment.update({
        where: { id },
        data: {
          status: 'PAID',
          paid_at: dto.paid_at ? new Date(dto.paid_at) : new Date(),
          method: dto.method ?? payment.method ?? undefined,
        },
        include: { customer: customerSelect },
      });
      await this.assignReceiptNumber(tx, companyId, id);
      await this.audit.record(tx, {
        companyId,
        actorType: 'USER',
        actorUserId: userId,
        action: 'payment.settled',
        entityType: 'payment',
        entityId: id,
        from: payment.status,
        to: 'PAID',
        humanText:
          `Recebimento de ${formatMoney(payment.amount.toString())} (${payment.customer.name}) ` +
          `baixado como pago`,
      });
      return updated;
    });
  }

  async update(id: string, companyId: string, dto: PaymentUpdateDto, userId: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { id, company_id: companyId, deleted_at: null },
      select: {
        id: true,
        work_order_id: true,
        status: true,
        amount: true,
        customer: customerSelect,
      },
    });
    if (!payment) throw new NotFoundException('Recebimento nao encontrado');

    const nextStatus = dto.status ?? payment.status;
    const paidAt =
      dto.paid_at === null
        ? null
        : dto.paid_at
          ? new Date(dto.paid_at)
          : nextStatus === 'PAID' && payment.status !== 'PAID'
            ? new Date()
            : payment.status === 'PAID' && nextStatus !== 'PAID'
              ? null
              : undefined;
    const dueDate =
      dto.due_date === null ? null : dto.due_date ? new Date(dto.due_date) : undefined;

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.payment.update({
        where: { id },
        data: {
          ...(dto.amount !== undefined ? { amount: dto.amount } : {}),
          ...(dto.method !== undefined ? { method: dto.method } : {}),
          ...(dto.status !== undefined ? { status: dto.status } : {}),
          ...(dueDate !== undefined ? { due_date: dueDate } : {}),
          ...(paidAt !== undefined ? { paid_at: paidAt } : {}),
        },
        include: { customer: customerSelect },
      });
      if (updated.status === 'PAID') await this.assignReceiptNumber(tx, companyId, id);
      const statusChanged = payment.status !== updated.status;
      const humanText = statusChanged
        ? `Recebimento de ${formatMoney(updated.amount.toString())} (${updated.customer.name}) alterado de ${STATUS_TEXT[payment.status] ?? payment.status} para ${STATUS_TEXT[updated.status] ?? updated.status}`
        : `Recebimento de ${formatMoney(updated.amount.toString())} (${updated.customer.name}) atualizado`;
      await this.audit.record(tx, {
        companyId,
        actorType: 'USER',
        actorUserId: userId,
        action: statusChanged ? 'payment.status_updated' : 'payment.updated',
        entityType: 'payment',
        entityId: id,
        from: payment.status,
        to: updated.status,
        reason: dto.justification,
        humanText,
      });
      if (payment.work_order_id) {
        await this.audit.record(tx, {
          companyId,
          actorType: 'USER',
          actorUserId: userId,
          action: 'work_order.payment_updated',
          entityType: 'work_order',
          entityId: payment.work_order_id,
          from: payment.status,
          to: updated.status,
          reason: dto.justification,
          humanText,
        });
      }
      return updated;
    });
  }

  async remove(id: string, companyId: string, dto: PaymentDeleteDto, userId: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { id, company_id: companyId, deleted_at: null },
      select: {
        id: true,
        work_order_id: true,
        status: true,
        amount: true,
        customer: customerSelect,
      },
    });
    if (!payment) throw new NotFoundException('Recebimento não encontrado');
    return this.prisma.$transaction(async (tx) => {
      const deleted = await tx.payment.update({ where: { id }, data: { deleted_at: new Date() } });
      const humanText = `Recebimento de ${formatMoney(payment.amount.toString())} (${payment.customer.name}) excluído`;
      await this.audit.record(tx, {
        companyId,
        actorType: 'USER',
        actorUserId: userId,
        action: 'payment.deleted',
        entityType: 'payment',
        entityId: id,
        from: payment.status,
        to: 'DELETED',
        reason: dto.justification,
        humanText,
      });
      if (payment.work_order_id) {
        await this.audit.record(tx, {
          companyId,
          actorType: 'USER',
          actorUserId: userId,
          action: 'work_order.payment_deleted',
          entityType: 'work_order',
          entityId: payment.work_order_id,
          from: payment.status,
          to: 'DELETED',
          reason: dto.justification,
          humanText,
        });
      }
      return deleted;
    });
  }
}

function imageMime(buffer: Buffer): string {
  if (buffer[0] === 0xff && buffer[1] === 0xd8) return 'image/jpeg';
  if (buffer.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
  return 'image/png';
}

function toDataUri(buffer: Buffer): string {
  return `data:${imageMime(buffer)};base64,${buffer.toString('base64')}`;
}
