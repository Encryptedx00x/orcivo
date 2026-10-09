import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { MemberRole, Prisma } from '@prisma/client';
import {
  ADMIN_ONLY_ACTIONS,
  STATUS_ACTION_SPECS,
  WO_CLOSED_STATUSES,
  WORK_ORDER_EXTRA_STATUSES,
  WorkOrderCreateDto,
  WorkOrderUpdateDto,
  woActionsFor,
  type StatusAction,
  type WorkOrderAction,
  type WorkOrderExtraStatus,
  type WorkOrderStatus,
} from '@orcivo/shared-types';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { PlanLimitsService } from '../plan-limits/plan-limits.service';
import { TenantOwnershipService } from '../common/tenant/tenant-ownership.service';
import { AuditService } from '../audit/audit.service';
import { StorageService, PHOTO_BUCKET } from '../storage/storage.service';

// Máquina de estados centralizada em shared-types (R5b) — reexportada para
// compatibilidade de quem já importava do service.
export {
  ADMIN_ONLY_ACTIONS,
  MANDATORY_REASON_ACTIONS,
  STATUS_ACTION_SPECS,
  WO_ACTIONS,
} from '@orcivo/shared-types';
export type {
  StatusAction,
  WorkOrderAction,
  WorkOrderExtraStatus,
  WorkOrderStatus,
} from '@orcivo/shared-types';

const WO_DETAIL_INCLUDE = {
  customer: true,
  photos: true,
  // total: the work order's value is the approved quote's (no amount of its own).
  quote: { select: { id: true, number: true, total: true } },
} as const;

@Injectable()
export class WorkOrderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly planLimitsService: PlanLimitsService,
    private readonly ownership: TenantOwnershipService,
    private readonly audit: AuditService,
    private readonly storage: StorageService,
  ) {}

  /** Photos are stored as object keys (P03-T07): readers get short-lived signed URLs. */
  private async withPhotoUrls<T extends { photos?: Array<{ file_url: string }> }>(
    wo: T,
  ): Promise<T> {
    if (!wo.photos?.length) return wo;
    const photos = await Promise.all(
      wo.photos.map(async (p) => ({
        ...p,
        file_url: (await this.storage.resolveUrl(PHOTO_BUCKET, p.file_url)) ?? p.file_url,
      })),
    );
    return { ...wo, photos };
  }

  // ── Máquina de ações de domínio (P-01 / ADR-016 / R5b) ─────────────────────

  /**
   * Ações permitidas no estado dado para o papel dado (AC4 — a web renderiza
   * os botões a partir desta lista). Ações de status extra só aparecem quando
   * a empresa ligou o extra (R5b). Sem papel informado, só ações não-admin.
   */
  allowedActions(
    status: WorkOrderStatus,
    role?: MemberRole | null,
    enabledExtras: readonly WorkOrderExtraStatus[] = [],
  ): WorkOrderAction[] {
    const actions = woActionsFor(status, enabledExtras);
    if (role === 'OWNER' || role === 'ADMIN') return [...actions];
    return actions.filter((action) => !ADMIN_ONLY_ACTIONS.includes(action));
  }

  /** Status extras ligados para a empresa (Configurações → Ordem de serviço, R5b). */
  private async enabledExtraStatuses(companyId: string): Promise<WorkOrderExtraStatus[]> {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { work_order_statuses: true },
    });
    return (company?.work_order_statuses ?? []) as WorkOrderExtraStatus[];
  }

  async changeStatus(
    id: string,
    companyId: string,
    userId: string,
    status: WorkOrderStatus,
    reason: string,
    role?: MemberRole,
  ) {
    const wo = await this.findOne(id, companyId);
    const action = (Object.keys(STATUS_ACTION_SPECS) as StatusAction[]).find((candidate) => {
      const spec = STATUS_ACTION_SPECS[candidate];
      return spec.to === status && spec.allowedFrom.includes(wo.status as WorkOrderStatus);
    });
    if (!action) {
      throw new BadRequestException(`Transição inválida: ${wo.status} → ${status}`);
    }
    const spec = STATUS_ACTION_SPECS[action];
    const enabledExtras = await this.enabledExtraStatuses(companyId);
    if (spec.requiresExtra && !enabledExtras.includes(spec.requiresExtra)) {
      throw new BadRequestException(
        `O status extra "${WORK_ORDER_EXTRA_STATUSES[spec.requiresExtra].label}" não está ativado nas configurações da empresa.`,
      );
    }
    if (!this.allowedActions(wo.status as WorkOrderStatus, role, enabledExtras).includes(action)) {
      throw new ForbiddenException('Apenas administradores podem reabrir uma OS encerrada.');
    }
    return this.applyStatusAction(
      id,
      companyId,
      userId,
      action,
      this.requireReason(reason, action),
      role,
      enabledExtras,
    );
  }

  /** iniciar: PENDING → IN_PROGRESS (qualquer membro ativo). */
  async start(id: string, companyId: string, userId: string, role?: MemberRole) {
    return this.applyStatusAction(id, companyId, userId, 'iniciar', null, role);
  }

  /** concluir: IN_PROGRESS → DONE (qualquer membro ativo). */
  async complete(id: string, companyId: string, userId: string, role?: MemberRole) {
    return this.applyStatusAction(id, companyId, userId, 'concluir', null, role);
  }

  /** cancelar: PENDING/IN_PROGRESS → CANCELLED. Motivo obrigatório (AC1). */
  async cancel(id: string, companyId: string, userId: string, reason?: string, role?: MemberRole) {
    return this.applyStatusAction(
      id,
      companyId,
      userId,
      'cancelar',
      this.requireReason(reason, 'cancelar'),
      role,
    );
  }

  /** reabrir (@AdminOnly): pós-conclusão → IN_PROGRESS. Motivo obrigatório (AC1/AC2). */
  async reopen(id: string, companyId: string, userId: string, reason?: string, role?: MemberRole) {
    return this.applyStatusAction(
      id,
      companyId,
      userId,
      'reabrir',
      this.requireReason(reason, 'reabrir'),
      role,
    );
  }

  // ── Status extras (R5b): só rodam com o extra ligado na empresa ────────────

  /** aguardar_pagamento: DONE → AWAITING_PAYMENT (extra opt-in). */
  async awaitPayment(id: string, companyId: string, userId: string, role?: MemberRole) {
    return this.applyStatusAction(id, companyId, userId, 'aguardar_pagamento', null, role);
  }

  /** receber_pagamento: AWAITING_PAYMENT → DONE (extra opt-in). */
  async receivePayment(id: string, companyId: string, userId: string, role?: MemberRole) {
    return this.applyStatusAction(id, companyId, userId, 'receber_pagamento', null, role);
  }

  /** acionar_garantia: DONE → WARRANTY (extra opt-in). */
  async claimWarranty(id: string, companyId: string, userId: string, role?: MemberRole) {
    return this.applyStatusAction(id, companyId, userId, 'acionar_garantia', null, role);
  }

  /**
   * corrigir (@AdminOnly): ajuste operacional pós-encerramento (DONE/CANCELLED).
   * Não muda o status (ADR-016); registra o diff dos campos tocados no audit —
   * o histórico permanece preservado (AC3). Motivo obrigatório (AC1).
   */
  async correct(
    id: string,
    companyId: string,
    userId: string,
    input: {
      reason?: string;
      title?: string;
      notes?: string;
      scheduled_at?: string;
      assigned_to_user_id?: string | null;
    },
    role?: MemberRole,
  ) {
    const reason = this.requireReason(input.reason, 'corrigir');
    const wo = await this.findOne(id, companyId);
    const from = wo.status as WorkOrderStatus;
    if (!WO_CLOSED_STATUSES.includes(from)) {
      throw new BadRequestException(
        `Corrigir é permitido apenas em OS encerrada (DONE/CANCELLED/AWAITING_PAYMENT/WARRANTY) — status atual: ${from}`,
      );
    }

    const data: Record<string, unknown> = {};
    if (input.title !== undefined) {
      const title = input.title.trim();
      if (!title) throw new BadRequestException('Título não pode ficar vazio');
      data.title = title;
    }
    if (input.notes !== undefined) data.notes = input.notes;
    if (input.scheduled_at !== undefined) {
      const scheduled = new Date(input.scheduled_at);
      if (Number.isNaN(scheduled.getTime())) {
        throw new BadRequestException('Data de agendamento inválida');
      }
      data.scheduled_at = scheduled;
    }
    if (input.assigned_to_user_id !== undefined) {
      if (input.assigned_to_user_id) {
        await this.ownership.assertActiveMember(input.assigned_to_user_id, companyId);
      }
      data.assigned_to_user_id = input.assigned_to_user_id || null;
    }

    const diff: string[] = [];
    if (data.title !== undefined && data.title !== wo.title) {
      diff.push(`título: "${wo.title}" → "${data.title}"`);
    }
    if (data.notes !== undefined && (wo.notes ?? null) !== (data.notes || null)) {
      diff.push('observações atualizadas');
    }
    if (
      data.scheduled_at !== undefined &&
      (wo.scheduled_at?.getTime() ?? null) !== (data.scheduled_at as Date).getTime()
    ) {
      diff.push('agendamento alterado');
    }
    if (
      data.assigned_to_user_id !== undefined &&
      wo.assigned_to_user_id !== data.assigned_to_user_id
    ) {
      diff.push('técnico atribuído alterado');
    }

    const humanText =
      `OS #${wo.number} "${wo.title}" (${wo.customer.name}) corrigida após encerramento` +
      (diff.length ? ` (${diff.join('; ')})` : '') +
      `: ${reason}`;

    return this.prisma.$transaction(async (tx) => {
      if (Object.keys(data).length > 0) {
        const result = await tx.workOrder.updateMany({ where: { id, status: from }, data });
        if (result.count === 0) {
          throw new ConflictException(`A OS saiu do estado ${from} antes da correção`);
        }
      }
      const updated = await tx.workOrder.findUnique({ where: { id }, include: WO_DETAIL_INCLUDE });
      if (!updated) throw new ConflictException('OS não encontrada após atualização');
      await this.audit.record(tx, {
        companyId,
        actorType: 'USER',
        actorUserId: userId,
        action: 'work_order.corrected',
        entityType: 'work_order',
        entityId: id,
        from,
        to: from,
        reason,
        humanText,
      });
      return this.withAllowedActions(updated, role);
    });
  }

  private requireReason(reason: string | undefined, action: WorkOrderAction): string {
    const trimmed = typeof reason === 'string' ? reason.trim() : '';
    if (!trimmed) {
      throw new BadRequestException(`Motivo é obrigatório para ${action} uma OS`);
    }
    return trimmed;
  }

  /**
   * Núcleo transacional compartilhado pelas ações que mudam status: valida o
   * estado de origem e o status extra (R5b), grava a mudança e a auditoria na
   * MESMA transação (ADR-015) e usa updateMany condicional para não perder
   * corrida concorrente.
   */
  private async applyStatusAction(
    id: string,
    companyId: string,
    userId: string,
    action: StatusAction,
    reason: string | null,
    role?: MemberRole,
    enabledExtras?: readonly WorkOrderExtraStatus[],
  ) {
    const wo = await this.findOne(id, companyId);
    const from = wo.status as WorkOrderStatus;
    const spec = STATUS_ACTION_SPECS[action];
    if (!spec.allowedFrom.includes(from)) {
      throw new BadRequestException(`Transição inválida: ${from} → ${spec.to} (${action})`);
    }
    const extras = enabledExtras ?? (await this.enabledExtraStatuses(companyId));
    if (spec.requiresExtra && !extras.includes(spec.requiresExtra)) {
      throw new BadRequestException(
        `O status extra "${WORK_ORDER_EXTRA_STATUSES[spec.requiresExtra].label}" não está ativado nas configurações da empresa.`,
      );
    }

    const data: Record<string, unknown> = { status: spec.to };
    if (action === 'iniciar') data.started_at = new Date();
    if (action === 'concluir') data.finished_at = new Date();
    if (action === 'reabrir') {
      // A próxima conclusão grava um novo finished_at; o anterior fica
      // preservado na trilha de auditoria (AC3 — histórico nunca é apagado).
      data.finished_at = null;
      data.started_at = wo.started_at ?? new Date();
    }
    // Status extras (aguardar/receber pagamento, garantia) preservam as datas
    // de início/conclusão: são marcações pós-conclusão, não nova execução.

    return this.prisma.$transaction(async (tx) => {
      const result = await tx.workOrder.updateMany({ where: { id, status: from }, data });
      if (result.count === 0) {
        throw new ConflictException(`Transição inválida: ${from} → ${spec.to}`);
      }
      const updated = await tx.workOrder.findUnique({ where: { id }, include: WO_DETAIL_INCLUDE });
      if (!updated) throw new ConflictException('OS não encontrada após atualização');
      await this.audit.record(tx, {
        companyId,
        actorType: 'USER',
        actorUserId: userId,
        action: spec.auditAction,
        entityType: 'work_order',
        entityId: id,
        from,
        to: spec.to,
        reason,
        humanText: this.describe(
          action,
          updated.number,
          updated.title,
          updated.customer.name,
          reason,
        ),
      });
      return this.withAllowedActions(updated, role, extras);
    });
  }

  private describe(
    action: StatusAction,
    number: number,
    title: string,
    customerName: string,
    reason: string | null,
  ): string {
    const ctx = `OS #${number} "${title}" (${customerName})`;
    switch (action) {
      case 'iniciar':
        return `${ctx} iniciada`;
      case 'concluir':
        return `${ctx} concluída`;
      case 'cancelar':
        return reason ? `${ctx} cancelada: ${reason}` : `${ctx} cancelada`;
      case 'reabrir':
        return `${ctx} reaberta para execução: ${reason}`;
      case 'aguardar_pagamento':
        return `${ctx} aguardando pagamento`;
      case 'receber_pagamento':
        return `${ctx} com pagamento recebido`;
      case 'acionar_garantia':
        return `${ctx} em garantia`;
    }
  }

  private withAllowedActions<T extends { status: string }>(
    wo: T,
    role?: MemberRole,
    enabledExtras: readonly WorkOrderExtraStatus[] = [],
  ): T & { allowed_actions: WorkOrderAction[] } {
    return {
      ...wo,
      allowed_actions: this.allowedActions(wo.status as WorkOrderStatus, role, enabledExtras),
    };
  }

  // ── CRUD ──────────────────────────────────────────────────────────────────

  private async nextWorkOrderNumber(companyId: string): Promise<number> {
    const key = `work-order:seq:${companyId}`;
    const [current, maxResult] = await Promise.all([
      this.redis.get(key),
      this.prisma.workOrder.aggregate({ where: { company_id: companyId }, _max: { number: true } }),
    ]);
    const dbMax = maxResult._max.number ?? 0;
    const redisVal = current !== null ? parseInt(current, 10) : 0;
    if (redisVal < dbMax) {
      await this.redis.set(key, String(dbMax));
    }
    return this.redis.incr(key);
  }

  async assertCreatable(dto: WorkOrderCreateDto, companyId: string, quoteId?: string) {
    await this.planLimitsService.enforceLimit(companyId, 'WORK_ORDERS_MONTH');
    await this.ownership.assertCustomer(dto.customer_id, companyId);
    await this.ownership.assertActiveMember(dto.assigned_to_user_id, companyId);
    await this.ownership.assertQuote(quoteId, companyId);
  }

  async create(
    dto: WorkOrderCreateDto,
    companyId: string,
    userId: string,
    quoteId?: string,
    initialStatus: WorkOrderStatus = 'PENDING',
    transaction?: Prisma.TransactionClient,
  ) {
    await this.assertCreatable(dto, companyId, quoteId);
    const number = await this.nextWorkOrderNumber(companyId);
    const persist = async (tx: Prisma.TransactionClient) => {
      const workOrder = await tx.workOrder.create({
        data: {
          company_id: companyId,
          customer_id: dto.customer_id,
          quote_id: quoteId,
          number,
          title: dto.title,
          notes: dto.notes,
          details: dto.details,
          status: initialStatus,
          scheduled_at: dto.scheduled_at ? new Date(dto.scheduled_at) : undefined,
          assigned_to_user_id: dto.assigned_to_user_id,
          created_by_user_id: userId,
          started_at: initialStatus === 'IN_PROGRESS' ? new Date() : undefined,
        },
        include: { customer: { select: { name: true } } },
      });
      await this.audit.record(tx, {
        companyId,
        actorType: 'USER',
        actorUserId: userId,
        action: 'work_order.created',
        entityType: 'work_order',
        entityId: workOrder.id,
        from: null,
        to: initialStatus,
        humanText:
          `OS #${workOrder.number} "${workOrder.title}" (${workOrder.customer.name}) criada` +
          (quoteId ? ' a partir de um orçamento aprovado' : ''),
      });
      return workOrder;
    };
    return transaction ? persist(transaction) : this.prisma.$transaction(persist);
  }

  async findAll(companyId: string, page = 1, limit = 20, role?: MemberRole, customerId?: string) {
    const [data, enabledExtras] = await Promise.all([
      this.prisma.workOrder.findMany({
        where: { company_id: companyId, ...(customerId ? { customer_id: customerId } : {}) },
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          customer: { select: { id: true, name: true } },
          photos: true,
          quote: WO_DETAIL_INCLUDE.quote,
        },
      }),
      this.enabledExtraStatuses(companyId),
    ]);
    const signed = await Promise.all(data.map((wo) => this.withPhotoUrls(wo)));
    return {
      data: signed.map((wo) => this.withAllowedActions(wo, role, enabledExtras)),
      page,
      limit,
    };
  }

  /** Detalhe da OS com as ações permitidas para o papel do chamador (AC4). */
  async findOne(id: string, companyId: string, role?: MemberRole) {
    const wo = await this.prisma.workOrder.findFirst({
      where: { id, company_id: companyId },
      include: WO_DETAIL_INCLUDE,
    });
    if (!wo) throw new NotFoundException();
    const enabledExtras = await this.enabledExtraStatuses(companyId);
    return this.withAllowedActions(await this.withPhotoUrls(wo), role, enabledExtras);
  }

  async update(id: string, dto: WorkOrderUpdateDto, companyId: string, userId: string) {
    const workOrder = await this.findOne(id, companyId);
    await this.ownership.assertActiveMember(dto.assigned_to_user_id, companyId);
    const { status, ...rest } = dto;
    if (status) {
      // P-01 (ADR-016): transições por `status` livre foram substituídas por
      // ações de domínio. Este caminho segue apenas como alias de
      // compatibilidade (mobile) e roteia para a ação equivalente — com a
      // mesma validação de estado, de extra (R5b) e a mesma auditoria.
      // `cancelar` exige motivo aqui também; o mobile ainda não envia motivo e
      // recebe 400 até migrar para PATCH /work-orders/:id/cancel (P-18).
      if (status === 'IN_PROGRESS') return this.start(id, companyId, userId);
      if (status === 'DONE') return this.complete(id, companyId, userId);
      if (status === 'CANCELLED') return this.cancel(id, companyId, userId);
      if (status === 'AWAITING_PAYMENT') return this.awaitPayment(id, companyId, userId);
      if (status === 'WARRANTY') return this.claimWarranty(id, companyId, userId);
      throw new BadRequestException(
        `Transição inválida via status: ${status}. Use as ações de domínio (iniciar, concluir, cancelar).`,
      );
    }
    if (WO_CLOSED_STATUSES.includes(workOrder.status as WorkOrderStatus)) {
      throw new BadRequestException('Use a correção administrativa para alterar uma OS encerrada.');
    }
    if (rest.started_at !== undefined || rest.finished_at !== undefined) {
      throw new BadRequestException(
        'As datas de início e conclusão são definidas pelas ações da OS.',
      );
    }
    const updated = await this.prisma.workOrder.updateMany({
      where: { id, company_id: companyId, status: { in: ['PENDING', 'IN_PROGRESS'] } },
      data: {
        ...rest,
        scheduled_at: rest.scheduled_at ? new Date(rest.scheduled_at) : undefined,
      },
    });
    if (updated.count !== 1) throw new ConflictException('A OS foi encerrada durante a edição.');
    return this.findOne(id, companyId);
  }
}
