import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import * as crypto from 'crypto';
import Decimal from 'decimal.js';
import { ApproveQuoteDto, QuoteCreateDto, assertValidTransition } from '@orcivo/shared-types';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { ConfigService } from '@nestjs/config';
import { StorageService, PDF_BUCKET, PHOTO_BUCKET } from '../storage/storage.service';
import { WorkOrderService } from '../work-order/work-order.service';
import { QuotePdfService } from './quote-pdf.service';
import { PlanLimitsService } from '../plan-limits/plan-limits.service';
import { TenantOwnershipService } from '../common/tenant/tenant-ownership.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class QuoteService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly config: ConfigService,
    @InjectQueue('quote-expiry') private readonly expiryQueue: Queue,
    private readonly storage: StorageService,
    private readonly workOrderService: WorkOrderService,
    private readonly pdfService: QuotePdfService,
    private readonly planLimitsService: PlanLimitsService,
    private readonly ownership: TenantOwnershipService,
    private readonly auditService: AuditService,
  ) {}

  private computeTotals(
    items: Array<{ quantity: string; unit_price: string }>,
    discountType: string,
    discountValue: string,
  ) {
    // NUNCA usar number/float — sempre Decimal.js
    const itemTotals = items.map((i) => new Decimal(i.quantity).mul(new Decimal(i.unit_price)));
    const subtotal = itemTotals.reduce((acc, t) => acc.add(t), new Decimal(0));
    const discountDec = new Decimal(discountValue || '0');
    const discount = discountType === 'PERCENT' ? subtotal.mul(discountDec).div(100) : discountDec;
    const total = subtotal.sub(discount);
    return {
      itemTotals: itemTotals.map((t) => t.toFixed(2)),
      subtotal: subtotal.toFixed(2),
      total: total.toFixed(2),
    };
  }

  private async nextQuoteNumber(companyId: string): Promise<number> {
    const key = `quote:seq:${companyId}`;
    // Se a chave não existir no Redis, inicializa a partir do max do banco
    const current = await this.redis.get(key);
    if (current === null) {
      const max = await this.prisma.quote.aggregate({
        where: { company_id: companyId },
        _max: { number: true },
      });
      const seed = max._max.number ?? 0;
      await this.redis.set(key, String(seed));
    }
    return this.redis.incr(key);
  }

  async create(dto: QuoteCreateDto, companyId: string, userId: string) {
    await this.planLimitsService.enforceLimit(companyId, 'QUOTES_MONTH');
    await this.ownership.assertCustomer(dto.customer_id, companyId);
    await this.ownership.assertCatalogItems(
      dto.items.map((i) => i.catalog_item_id),
      companyId,
    );
    const number = await this.nextQuoteNumber(companyId);
    const { itemTotals, subtotal, total } = this.computeTotals(
      dto.items,
      dto.discount_type ?? 'PERCENT',
      dto.discount_value ?? '0',
    );

    return this.prisma.quote.create({
      data: {
        company_id: companyId,
        customer_id: dto.customer_id,
        number,
        title: dto.title,
        notes: dto.notes,
        valid_until: dto.valid_until ? new Date(dto.valid_until) : undefined,
        discount_type: dto.discount_type ?? 'PERCENT',
        discount_value: dto.discount_value ?? '0',
        subtotal,
        total,
        created_by_user_id: userId,
        items: {
          create: dto.items.map((item, i) => ({
            company_id: companyId,
            catalog_item_id: item.catalog_item_id,
            description: item.description,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total: itemTotals[i],
          })),
        },
      },
      include: { items: true },
    });
  }

  async findAll(companyId: string, page = 1, limit = 20) {
    const where = { company_id: companyId };
    const data = await this.prisma.quote.findMany({
      where,
      orderBy: { created_at: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        customer: { select: { id: true, name: true } },
        items: true,
      },
    });
    return { data: await Promise.all(data.map((q) => this.withSignedUrls(q))), page, limit };
  }

  async findOne(id: string, companyId: string) {
    const quote = await this.prisma.quote.findFirst({
      where: { id, company_id: companyId },
      include: { items: true, customer: true, approval: true },
    });
    if (!quote) throw new NotFoundException();
    return this.withSignedUrls(quote);
  }

  /**
   * P03-T05/T07: stored refs are object keys; resolve them to short-lived signed
   * URLs on the way out. Legacy rows holding a full public URL are handled by
   * StorageService.extractKey.
   */
  private async withSignedUrls<
    T extends {
      pdf_url?: string | null;
      approval?: { signature_image_url?: string | null } | null;
    },
  >(quote: T): Promise<T> {
    const pdf_url = await this.storage.resolveUrl(PDF_BUCKET, quote.pdf_url ?? null);
    const approval =
      quote.approval && 'signature_image_url' in quote.approval
        ? {
            ...quote.approval,
            signature_image_url: await this.storage.resolveUrl(
              PHOTO_BUCKET,
              quote.approval.signature_image_url ?? null,
            ),
          }
        : quote.approval;
    return { ...quote, pdf_url, approval };
  }

  /** Gera o PDF do orçamento sob demanda (sem alterar o status). */
  async generatePdf(id: string, companyId: string): Promise<Buffer> {
    const quote = await this.findOne(id, companyId);
    const company = await this.prisma.company.findUniqueOrThrow({
      where: { id: companyId },
    });
    return this.pdfService.generate(
      {
        ...quote,
        customer_name: (quote as never as { customer: { name: string } }).customer?.name,
      } as never,
      company as never,
    );
  }

  async send(id: string, companyId: string, userId: string) {
    const quote = await this.findOne(id, companyId);
    try {
      assertValidTransition(quote.status as never, 'SENT');
    } catch {
      throw new BadRequestException(`Transicao invalida: ${quote.status} -> SENT`);
    }
    const customerName =
      (quote as unknown as { customer?: { name?: string } }).customer?.name ?? 'cliente';
    const fromStatus = quote.status as string;

    // Gerar PDF e salvar no MinIO
    const company = await this.prisma.company.findUniqueOrThrow({ where: { id: companyId } });
    const pdfBuffer = await this.pdfService.generate(
      {
        ...quote,
        customer_name: (quote as never as { customer: { name: string } }).customer?.name,
      } as never,
      company as never,
    );
    const pdfObjectName = `${companyId}/quotes/${id}.pdf`;
    const pdfKey = await this.storage.uploadBuffer(
      PDF_BUCKET,
      pdfObjectName,
      pdfBuffer,
      'application/pdf',
    );

    const token = crypto.randomUUID();
    const ttl = 7 * 24 * 60 * 60; // 7 dias em segundos = 604800
    await this.redis.set(`quote:approval:${token}`, id, 'EX', ttl);

    const updated = await this.prisma.$transaction(async (tx) => {
      const q = await tx.quote.update({
        where: { id },
        data: { status: 'SENT', approval_token: token, pdf_url: pdfKey },
        include: { items: true, customer: true, approval: true },
      });
      await this.auditService.record(tx, {
        companyId,
        actorType: 'USER',
        actorUserId: userId,
        action: 'quote.sent',
        entityType: 'quote',
        entityId: id,
        from: fromStatus,
        to: 'SENT',
        humanText: `Orçamento #${q.number} (${customerName}) enviado para aprovação`,
      });
      return q;
    });

    // Agendar job de expiracao se valid_until definido
    if (updated.valid_until) {
      const delay = updated.valid_until.getTime() - Date.now();
      if (delay > 0) {
        await this.expiryQueue.add('expire', { quoteId: id }, { delay });
      }
    }

    const approvalUrl = `${this.config.get('APP_WEB_URL', 'http://localhost:3000')}/approve/${token}`;
    return { ...(await this.withSignedUrls(updated)), approvalUrl };
  }

  async approve(token: string, dto: ApproveQuoteDto, ipAddress: string, userAgent: string) {
    const quote = await this.getByApprovalToken(token);
    // quote garantidamente tem: id, company_id, created_by_user_id, number, status, customer.id
    // (garantido pelo select explicito em getByApprovalToken() — P05)

    // Idempotencia via $transaction com count check (Pitfall 2 do RESEARCH.md)
    const result = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.quote.updateMany({
        where: { id: quote.id, status: 'SENT' }, // so atualiza se ainda SENT
        data: { status: 'APPROVED' },
      });
      if (updated.count === 0) return null; // ja aprovado ou nao e SENT

      // Registrar AuditLog dentro da mesma transaction (D2-14 / ADR-015).
      // actorType CUSTOMER: aprovação feita pelo cliente via link público (sem sessão).
      await this.auditService.record(tx, {
        companyId: quote.company_id,
        actorType: 'CUSTOMER',
        action: 'quote.approved',
        entityType: 'quote',
        entityId: quote.id,
        from: 'SENT',
        to: 'APPROVED',
        humanText:
          `Orçamento #${quote.number} (${quote.customer.name}) aprovado pelo cliente ` +
          `via ${dto.approval_method} (IP ${ipAddress})`,
      });

      return updated;
    });

    if (!result) throw new ConflictException('Orcamento ja foi processado');

    // Processar assinatura se DRAWN_SIGNATURE
    let signatureKey: string | undefined;
    if (dto.approval_method === 'DRAWN_SIGNATURE' && dto.signature) {
      const base64 = (dto.signature as string).replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64, 'base64');
      this.storage.assertUploadable(buffer, 'image/png', 5 * 1024 * 1024, ['image/png']);
      const objectName = `${quote.company_id}/signatures/${crypto.randomUUID()}.png`;
      signatureKey = await this.storage.uploadBuffer(PHOTO_BUCKET, objectName, buffer, 'image/png');
    }

    // Registrar QuoteApproval
    await this.prisma.quoteApproval.create({
      data: {
        company_id: quote.company_id,
        quote_id: quote.id,
        approval_method: dto.approval_method,
        typed_name: dto.typed_name,
        signature_image_url: signatureKey,
        ip_address: ipAddress,
        user_agent: userAgent ?? '',
      },
    });

    // Regenerar PDF com assinatura e sobrescrever o objeto MinIO
    const company = await this.prisma.company.findUniqueOrThrow({
      where: { id: quote.company_id },
    });
    // The PDF renderer fetches <Image src> — give it a short-lived signed URL.
    const signatureSignedUrl = signatureKey
      ? await this.storage.getSignedUrl(PHOTO_BUCKET, signatureKey)
      : null;
    const quoteForPdf = {
      ...quote,
      customer_name: quote.customer.name,
      approval: {
        approval_method: dto.approval_method,
        typed_name: dto.typed_name ?? null,
        signature_image_url: signatureSignedUrl,
      },
    };
    const pdfBuffer = await this.pdfService.generate(quoteForPdf as never, company as never);
    const pdfObjectName = `${quote.company_id}/quotes/${quote.id}.pdf`;
    const pdfKey = await this.storage.uploadBuffer(
      PDF_BUCKET,
      pdfObjectName,
      pdfBuffer,
      'application/pdf',
    );
    await this.prisma.quote.update({ where: { id: quote.id }, data: { pdf_url: pdfKey } });

    // Criar WorkOrder automaticamente (D2-14)
    const woTitle = quote.title ? `OS — ${quote.title}` : `OS #${quote.number}`;
    await this.workOrderService.create(
      { customer_id: quote.customer.id, title: woTitle },
      quote.company_id,
      quote.created_by_user_id!,
      quote.id,
      'IN_PROGRESS',
    );

    return { status: 'APPROVED' };
  }

  async cancel(id: string, companyId: string, userId: string, reason?: string) {
    const quote = await this.findOne(id, companyId);
    try {
      assertValidTransition(quote.status as never, 'CANCELLED');
    } catch {
      throw new BadRequestException(`Transição inválida: ${quote.status} → CANCELLED`);
    }
    const customerName =
      (quote as unknown as { customer?: { name?: string } }).customer?.name ?? 'cliente';
    const fromStatus = quote.status as string;

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.quote.update({
        where: { id },
        data: { status: 'CANCELLED', notes: reason },
        include: { items: true, customer: true, approval: true },
      });
      await this.auditService.record(tx, {
        companyId,
        actorType: 'USER',
        actorUserId: userId,
        action: 'quote.cancelled',
        entityType: 'quote',
        entityId: id,
        from: fromStatus,
        to: 'CANCELLED',
        reason: reason ?? null,
        humanText:
          `Orçamento #${updated.number} (${customerName}) cancelado` +
          (reason ? `: ${reason}` : ''),
      });
      return updated;
    });
  }

  async getByApprovalToken(token: string) {
    // Verificar Redis primeiro, fallback ao banco (token pode ter expirado do Redis mas estar no banco)
    const cachedId = await this.redis.get(`quote:approval:${token}`);
    const selectFields = {
      id: true,
      company_id: true,
      created_by_user_id: true,
      number: true,
      status: true,
      valid_until: true,
      total: true,
      title: true,
      discount_type: true,
      discount_value: true,
      subtotal: true,
      notes: true,
      customer: { select: { id: true, name: true, phone: true } },
      items: {
        select: {
          id: true,
          description: true,
          quantity: true,
          unit_price: true,
          total: true,
        },
      },
      company: { select: { trade_name: true, allowed_approval_methods: true } },
    };

    const quote = cachedId
      ? await this.prisma.quote.findFirst({
          where: { id: cachedId },
          select: selectFields,
        })
      : await this.prisma.quote.findFirst({
          where: { approval_token: token },
          select: selectFields,
        });

    if (!quote) throw new NotFoundException('Orçamento não encontrado ou link inválido');
    return quote;
  }

  /**
   * Serve o PDF já gerado (em `send()`/`approve()`) para o dono do approval_token.
   * Resolucao do token -> id segue o mesmo caminho de getByApprovalToken() (Redis
   * com fallback ao banco), garantindo que só o orçamento daquele token é acessível.
   */
  async getPdfByApprovalToken(token: string): Promise<Buffer> {
    const cachedId = await this.redis.get(`quote:approval:${token}`);
    const quote = cachedId
      ? await this.prisma.quote.findFirst({
          where: { id: cachedId },
          select: { id: true, pdf_url: true, approval_token: true },
        })
      : await this.prisma.quote.findFirst({
          where: { approval_token: token },
          select: { id: true, pdf_url: true, approval_token: true },
        });

    if (!quote) throw new NotFoundException('Orçamento não encontrado ou link inválido');
    // O cache Redis (id do token -> quote id) pode ficar dessincronizado do banco
    // (token rotacionado por um novo send() ou já expirado ali). Revalidar contra o
    // approval_token atual do banco antes de servir o PDF — nunca confiar só no cache.
    if (quote.approval_token !== token) {
      throw new NotFoundException('Orçamento não encontrado ou link inválido');
    }

    const key = this.storage.extractKey(PDF_BUCKET, quote.pdf_url);
    if (!key) throw new NotFoundException('PDF ainda não foi gerado para este orçamento.');

    return this.storage.getObjectBuffer(PDF_BUCKET, key);
  }
}
