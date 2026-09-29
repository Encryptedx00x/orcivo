import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import type { MemberRole } from '@prisma/client';
import * as crypto from 'crypto';
import Decimal from 'decimal.js';
import {
  ApproveQuoteDto,
  QuoteAction,
  QuoteActionSpec,
  QuoteCreateDto,
  QuoteStatus,
  QuoteUpdateDto,
  assertValidQuoteAction,
  quoteAllowedActions,
} from '@orcivo/shared-types';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { ConfigService } from '@nestjs/config';
import { StorageService, PDF_BUCKET, PHOTO_BUCKET } from '../storage/storage.service';
import { WorkOrderService } from '../work-order/work-order.service';
import { QuotePdfService } from './quote-pdf.service';
import { PlanLimitsService } from '../plan-limits/plan-limits.service';
import { TenantOwnershipService } from '../common/tenant/tenant-ownership.service';
import { AuditService } from '../audit/audit.service';
import { UsersService } from '../users/users.service';

const APPROVAL_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;
const APPROVAL_TOKEN_TTL_MS = APPROVAL_TOKEN_TTL_SECONDS * 1000;

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
    private readonly usersService: UsersService,
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

  async findAll(companyId: string, page = 1, limit = 20, role?: MemberRole) {
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
    return {
      data: await Promise.all(
        data.map(async (q) => this.withAllowedActions(await this.withSignedUrls(q), role)),
      ),
      page,
      limit,
    };
  }

  async findOne(id: string, companyId: string, role?: MemberRole) {
    const quote = await this.prisma.quote.findFirst({
      where: { id, company_id: companyId },
      include: { items: true, customer: true, approval: true },
    });
    if (!quote) throw new NotFoundException();
    return this.withAllowedActions(await this.withSignedUrls(quote), role);
  }

  /**
   * PB1-P35/AC2: anexa as ações de domínio válidas para o estado atual + papel
   * do chamador — a UI renderiza botões só a partir desta lista, mas o backend
   * continua sendo a autoridade (cada ação revalida a origem antes de escrever).
   */
  private withAllowedActions<T extends { status: string }>(
    quote: T,
    role?: MemberRole,
  ): T & { allowed_actions: QuoteAction[] } {
    const isAdmin = role === 'OWNER' || role === 'ADMIN';
    return {
      ...quote,
      allowed_actions: quoteAllowedActions(quote.status as QuoteStatus, isAdmin),
    };
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

  /**
   * Gera o PDF do orçamento sob demanda (sem alterar o status e sem substituir
   * o artefato enviado). PB1-P12/AC3: carimba o estado atual — o estado
   * verdadeiro no momento desta geração.
   */
  async generatePdf(id: string, companyId: string): Promise<Buffer> {
    const quote = await this.findOne(id, companyId);
    const company = await this.prisma.company.findUniqueOrThrow({
      where: { id: companyId },
    });
    return this.pdfService.generate(
      {
        ...quote,
        customer_name: quote.customer?.name ?? null,
      },
      company,
    );
  }

  /**
   * PB1-P35/AC1: edição direta dos campos do orçamento — sem passar pelo
   * assistente guiado de criação. Só é permitida em DRAFT: um orçamento já
   * enviado/aprovado tem um PDF e (possivelmente) uma assinatura do cliente
   * vinculados a um conteúdo específico — editar o conteúdo por baixo
   * quebraria essa garantia (ADR-016). Para editar um orçamento em estado
   * terminal, use a ação `corrigir` para trazê-lo de volta a DRAFT primeiro.
   */
  async update(
    id: string,
    dto: QuoteUpdateDto,
    companyId: string,
    userId: string,
    role?: MemberRole,
  ) {
    const quote = await this.prisma.quote.findFirst({
      where: { id, company_id: companyId },
      include: { items: true },
    });
    if (!quote) throw new NotFoundException();
    if (quote.status !== 'DRAFT') {
      throw new BadRequestException(
        `Edição direta só é permitida em orçamentos em rascunho (status atual: ${quote.status}). ` +
          `Use a ação "corrigir" para trazer o orçamento de volta a rascunho antes de editar.`,
      );
    }

    if (dto.customer_id) {
      await this.ownership.assertCustomer(dto.customer_id, companyId);
    }
    if (dto.items) {
      await this.ownership.assertCatalogItems(
        dto.items.map((i) => i.catalog_item_id),
        companyId,
      );
    }

    const discountType = dto.discount_type ?? (quote.discount_type as 'PERCENT' | 'FIXED');
    const discountValue = dto.discount_value ?? quote.discount_value.toString();
    const items = dto.items ?? quote.items;
    const { itemTotals, subtotal, total } = this.computeTotals(
      items.map((i) => ({ quantity: i.quantity.toString(), unit_price: i.unit_price.toString() })),
      discountType,
      discountValue.toString(),
    );

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.quote.update({
        where: { id },
        data: {
          customer_id: dto.customer_id,
          title: dto.title,
          notes: dto.notes,
          valid_until: dto.valid_until ? new Date(dto.valid_until) : undefined,
          discount_type: discountType,
          discount_value: discountValue,
          subtotal,
          total,
          ...(dto.items
            ? {
                items: {
                  deleteMany: {},
                  create: dto.items.map((item, i) => ({
                    company_id: companyId,
                    catalog_item_id: item.catalog_item_id,
                    description: item.description,
                    quantity: item.quantity,
                    unit_price: item.unit_price,
                    total: itemTotals[i],
                  })),
                },
              }
            : {}),
        },
      });
      const persisted = await tx.quote.findUnique({
        where: { id },
        include: { items: true, customer: true, approval: true },
      });
      if (!persisted) throw new ConflictException('Orcamento nao encontrado apos atualizacao');
      await this.auditService.record(tx, {
        companyId,
        actorType: 'USER',
        actorUserId: userId,
        action: 'quote.updated',
        entityType: 'quote',
        entityId: id,
        from: 'DRAFT',
        to: 'DRAFT',
        humanText: `Orçamento #${persisted.number} (${persisted.customer.name}) editado diretamente`,
      });
      return persisted;
    });

    return this.withAllowedActions(await this.withSignedUrls(updated), role);
  }

  // ── Máquina de ações de domínio (PB1-P01 / ADR-016) ────────────────────────

  /**
   * Porta única da máquina de estados (AC1/AC5): valida o estado de origem da
   * ação contra QUOTE_ACTIONS e devolve a especificação da ação. Transição
   * inválida → BadRequestException com mensagem clara, antes de qualquer escrita.
   */
  private assertAction(action: QuoteAction, from: QuoteStatus): QuoteActionSpec {
    try {
      return assertValidQuoteAction(action, from);
    } catch (error) {
      throw new BadRequestException((error as Error).message);
    }
  }

  /**
   * Mesma porta para a ação `aprovar` no link público, mas com erro de
   * conflito (409): o visitante não tem sessão para corrigir um BadRequest.
   * PB1-P12: a especificação retornada também define o estado carimbado no
   * PDF regenerado pós-aprovação.
   */
  private assertApprovalAction(from: QuoteStatus): QuoteActionSpec {
    try {
      return assertValidQuoteAction('aprovar', from);
    } catch (error) {
      throw new ConflictException((error as Error).message);
    }
  }

  /**
   * Motivo obrigatório para recusar/cancelar/reabrir/corrigir (AC1). O motivo
   * vai SÓ para a trilha de auditoria — nunca sobrescreve `notes` (AC3).
   */
  private requireReason(reason: string | undefined, action: QuoteAction): string {
    const trimmed = reason?.trim();
    if (!trimmed) {
      throw new BadRequestException(`Motivo é obrigatório para ${action} um orçamento`);
    }
    return trimmed;
  }

  /**
   * PB1-P10/AC2: quando o técnico opta por aplicar a assinatura reutilizável
   * no envio, resolve a assinatura privada (P03 storage, tenant-scoped por
   * company_id+user_id) para uma signed URL de uso único pelo renderer do
   * PDF. Sem assinatura salva ou sem opt-in, retorna null.
   */
  private async resolveTechnicianSignatureUrl(
    companyId: string,
    userId: string,
    applySignature: boolean,
  ): Promise<string | null> {
    if (!applySignature) return null;
    return this.usersService.resolveSignatureUrl(companyId, userId);
  }

  async send(
    id: string,
    companyId: string,
    userId: string,
    applySignature = false,
    role?: MemberRole,
  ) {
    const quote = await this.findOne(id, companyId);
    const fromStatus = quote.status as QuoteStatus;
    const spec = this.assertAction('enviar', fromStatus);
    const customerName =
      (quote as unknown as { customer?: { name?: string } }).customer?.name ?? 'cliente';

    const technicianSignatureUrl = await this.resolveTechnicianSignatureUrl(
      companyId,
      userId,
      applySignature,
    );

    // Gerar PDF e salvar no MinIO. PB1-P12/AC2: o PDF anexado ao envio carimba
    // o destino da ação (`enviar` → SENT) — o estado que se torna verdadeiro
    // neste momento. Um PDF enviado nunca exibe 'Rascunho'.
    const company = await this.prisma.company.findUniqueOrThrow({ where: { id: companyId } });
    const pdfBuffer = await this.pdfService.generate(
      {
        ...quote,
        status: spec.to,
        customer_name: quote.customer?.name ?? null,
        technician_signature_url: technicianSignatureUrl,
      },
      company,
    );
    const pdfObjectName = `${companyId}/quotes/${id}.pdf`;
    const pdfKey = await this.storage.uploadBuffer(
      PDF_BUCKET,
      pdfObjectName,
      pdfBuffer,
      'application/pdf',
    );

    const token = crypto.randomUUID();
    await this.redis.set(`quote:approval:${token}`, id, 'EX', APPROVAL_TOKEN_TTL_SECONDS);

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
        humanText:
          `Orçamento #${q.number} (${customerName}) enviado para aprovação` +
          (technicianSignatureUrl ? ' com assinatura do técnico aplicada' : ''),
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
    return {
      ...this.withAllowedActions(await this.withSignedUrls(updated), role),
      approvalUrl,
    };
  }

  async approve(token: string, dto: ApproveQuoteDto, ipAddress: string, userAgent: string) {
    const quote = await this.getByApprovalToken(token);
    // quote garantidamente tem: id, company_id, created_by_user_id, number, status, customer.id
    // (garantido pelo select explicito em getByApprovalToken() — P05)

    // Ação de domínio `aprovar` (AC1/AC5): só SENT pode ser aprovado. O link
    // público de um orçamento já processado (aprovado, recusado, cancelado ou
    // reaberto para edição) recebe um erro claro com a transição inválida —
    // a condição `status: 'SENT'` no updateMany abaixo continua sendo a
    // guarda autoritativa contra corrida concorrente.
    const approveSpec = this.assertApprovalAction(quote.status as QuoteStatus);

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
      // PB1-P12/AC3: o PDF regenerado carimba o estado no instante desta
      // geração — o orçamento acabou de ser aprovado (`aprovar` → APPROVED).
      status: approveSpec.to,
      customer_name: quote.customer.name,
      approval: {
        approval_method: dto.approval_method,
        typed_name: dto.typed_name ?? null,
        signature_image_url: signatureSignedUrl,
      },
    };
    const pdfBuffer = await this.pdfService.generate(quoteForPdf, company);
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

  /**
   * cancelar (PB1-P01 / ADR-016 / T17): DRAFT/SENT → CANCELLED. Motivo
   * obrigatório (AC1) — e o motivo vai SÓ para a trilha de auditoria:
   * `notes` NUNCA é sobrescrito (AC3). A mudança de status usa updateMany
   * condicional ao estado de origem, então a auditoria é gravada apenas
   * para a transição vencedora.
   */
  async cancel(id: string, companyId: string, userId: string, reason?: string, role?: MemberRole) {
    const quote = await this.findOne(id, companyId);
    const fromStatus = quote.status as QuoteStatus;
    this.assertAction('cancelar', fromStatus);
    const trimmedReason = this.requireReason(reason, 'cancelar');
    const customerName =
      (quote as unknown as { customer?: { name?: string } }).customer?.name ?? 'cliente';

    return this.prisma.$transaction(async (tx) => {
      const result = await tx.quote.updateMany({
        where: { id, status: fromStatus },
        data: { status: 'CANCELLED' },
      });
      if (result.count === 0) {
        throw new ConflictException(`Transicao invalida: ${fromStatus} -> CANCELLED`);
      }
      const persisted = await tx.quote.findUnique({
        where: { id },
        include: { items: true, customer: true, approval: true },
      });
      if (!persisted) {
        throw new ConflictException('Orcamento nao encontrado apos atualizacao');
      }
      await this.auditService.record(tx, {
        companyId,
        actorType: 'USER',
        actorUserId: userId,
        action: 'quote.cancelled',
        entityType: 'quote',
        entityId: id,
        from: fromStatus,
        to: 'CANCELLED',
        reason: trimmedReason,
        humanText: `Orçamento #${persisted.number} (${customerName}) cancelado: ${trimmedReason}`,
      });
      return this.withAllowedActions(persisted, role);
    });
  }

  /**
   * Recusa (recusar — P-01/ADR-015): SENT → REJECTED. Motivo obrigatório e —
   * como no cancelamento — nunca sobrescreve `notes`; o motivo vive só na
   * trilha de auditoria. Exatamente uma linha de auditoria com from/to/reason.
   */
  async reject(id: string, companyId: string, userId: string, reason?: string, role?: MemberRole) {
    const quote = await this.findOne(id, companyId);
    const fromStatus = quote.status as QuoteStatus;
    this.assertAction('recusar', fromStatus);
    const trimmedReason = this.requireReason(reason, 'recusar');
    const customerName =
      (quote as unknown as { customer?: { name?: string } }).customer?.name ?? 'cliente';

    return this.prisma.$transaction(async (tx) => {
      const result = await tx.quote.updateMany({
        where: { id, status: fromStatus },
        data: { status: 'REJECTED' },
      });
      if (result.count === 0) {
        throw new ConflictException(`Transicao invalida: ${fromStatus} -> REJECTED`);
      }
      const persisted = await tx.quote.findUnique({
        where: { id },
        include: { items: true, customer: true, approval: true },
      });
      if (!persisted) {
        throw new ConflictException('Orcamento nao encontrado apos atualizacao');
      }
      const updated = persisted;
      await this.auditService.record(tx, {
        companyId,
        actorType: 'USER',
        actorUserId: userId,
        action: 'quote.rejected',
        entityType: 'quote',
        entityId: id,
        from: fromStatus,
        to: 'REJECTED',
        reason: trimmedReason,
        humanText: `Orçamento #${updated.number} (${customerName}) recusado: ${trimmedReason}`,
      });
      return this.withAllowedActions(updated, role);
    });
  }

  /**
   * Reabrir (reabrir — @AdminOnly): traz um orçamento de um estado terminal
   * (REJECTED/EXPIRED/CANCELLED) de volta para SENT para uma nova rodada de
   * aprovação. Motivo obrigatório; uma linha de auditoria com from/to/reason.
   * A origem é validada contra QUOTE_ACTIONS (a máquina compartilhada) — sem
   * bypass local. O histórico anterior é preservado (AC4).
   */
  async reopen(id: string, companyId: string, userId: string, reason?: string, role?: MemberRole) {
    return this.reopenOrCorrect(id, companyId, userId, reason, 'reabrir', role);
  }

  /**
   * Corrigir (corrigir — @AdminOnly): devolve um orçamento terminal
   * (APPROVED/REJECTED/EXPIRED/CANCELLED) para DRAFT para ajuste de
   * itens/valores antes de reenviar. Motivo obrigatório; uma linha de
   * auditoria com from/to/reason.
   */
  async correct(id: string, companyId: string, userId: string, reason?: string, role?: MemberRole) {
    return this.reopenOrCorrect(id, companyId, userId, reason, 'corrigir', role);
  }

  private async reopenOrCorrect(
    id: string,
    companyId: string,
    userId: string,
    reason: string | undefined,
    action: 'reabrir' | 'corrigir',
    role?: MemberRole,
  ) {
    const quote = await this.findOne(id, companyId);
    const fromStatus = quote.status as QuoteStatus;
    const spec = this.assertAction(action, fromStatus);
    const to = spec.to as 'SENT' | 'DRAFT';
    const trimmedReason = this.requireReason(reason, action);
    const customerName =
      (quote as unknown as { customer?: { name?: string } }).customer?.name ?? 'cliente';
    const auditAction = action === 'reabrir' ? 'quote.reopened' : 'quote.corrected';
    const describe = (num: number, r: string): string =>
      action === 'reabrir'
        ? `Orçamento #${num} (${customerName}) reaberto para nova aprovação: ${r}`
        : `Orçamento #${num} (${customerName}) reaberto para correção (voltou para rascunho): ${r}`;

    const newApprovalToken = to === 'SENT' ? crypto.randomUUID() : undefined;
    const newValidUntil = to === 'SENT' ? new Date(Date.now() + APPROVAL_TOKEN_TTL_MS) : undefined;
    const previousApprovalToken =
      (quote as unknown as { approval_token?: string | null }).approval_token ?? undefined;
    const data: { status: 'SENT' | 'DRAFT'; approval_token?: string; valid_until?: Date } = {
      status: to,
    };
    if (to === 'SENT' && newApprovalToken && newValidUntil) {
      data.approval_token = newApprovalToken;
      data.valid_until = newValidUntil;
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.quote.updateMany({
        where: { id, status: fromStatus },
        data,
      });
      if (result.count === 0) {
        throw new ConflictException(`Transicao invalida: ${fromStatus} -> ${to}`);
      }
      const persisted = await tx.quote.findUnique({
        where: { id },
        include: { items: true, customer: true, approval: true },
      });
      if (!persisted) {
        throw new ConflictException('Orcamento nao encontrado apos atualizacao');
      }
      const winning = persisted;
      await this.auditService.record(tx, {
        companyId,
        actorType: 'USER',
        actorUserId: userId,
        action: auditAction,
        entityType: 'quote',
        entityId: id,
        from: fromStatus,
        to,
        reason: trimmedReason,
        humanText: describe(winning.number, trimmedReason),
      });
      return winning;
    });

    if (to === 'SENT' && newApprovalToken) {
      await this.redis.set(
        `quote:approval:${newApprovalToken}`,
        id,
        'EX',
        APPROVAL_TOKEN_TTL_SECONDS,
      );
      if (previousApprovalToken && previousApprovalToken !== newApprovalToken) {
        await this.redis.del(`quote:approval:${previousApprovalToken}`);
      }
    }

    const signed = this.withAllowedActions(await this.withSignedUrls(updated), role);
    if (to === 'SENT' && newApprovalToken) {
      return {
        ...signed,
        approvalUrl: `${this.config.get('APP_WEB_URL', 'http://localhost:3000')}/approve/${newApprovalToken}`,
      };
    }
    return signed;
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
      approval_token: true,
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
    if (quote.approval_token !== token) {
      throw new NotFoundException('Orcamento nao encontrado ou link invalido');
    }
    const { approval_token, ...safeQuote } = quote;
    void approval_token;
    return safeQuote;
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
