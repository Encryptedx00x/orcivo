import { z } from 'zod';

/**
 * Máquina de estados da OS (R5b) — regra única para backend, web e app.
 * Nenhuma superfície duplica transições/labels: todas consomem daqui.
 */
export const WorkOrderStatusEnum = z.enum([
  'PENDING',
  'IN_PROGRESS',
  'DONE',
  'CANCELLED',
  'AWAITING_PAYMENT',
  'WARRANTY',
]);
export type WorkOrderStatus = z.infer<typeof WorkOrderStatusEnum>;

/** Labels pt-BR de todos os status, prontas para badges/filtros. */
export const WORK_ORDER_STATUS_LABELS: Record<WorkOrderStatus, string> = {
  PENDING: 'Pendente',
  IN_PROGRESS: 'Em execução',
  DONE: 'Concluída',
  CANCELLED: 'Cancelada',
  AWAITING_PAYMENT: 'Aguardando pagamento',
  WARRANTY: 'Em garantia',
};

/**
 * Status extras da OS (R5b), opt-in por empresa em Configurações → Ordem de
 * serviço (`companies.work_order_statuses`). Fora desta lista ficam desligados.
 */
export const WORK_ORDER_EXTRA_STATUSES = {
  AWAITING_PAYMENT: { label: 'Aguardando pagamento' },
  WARRANTY: { label: 'Em garantia' },
} as const;
export type WorkOrderExtraStatus = keyof typeof WORK_ORDER_EXTRA_STATUSES;
const EXTRA_KEYS = Object.keys(WORK_ORDER_EXTRA_STATUSES) as [
  WorkOrderExtraStatus,
  ...WorkOrderExtraStatus[],
];

/** Lista de status extras aceita no toggle da empresa (sem duplicados). */
export const WorkOrderExtraStatusListSchema = z
  .array(z.enum(EXTRA_KEYS))
  .max(EXTRA_KEYS.length)
  .transform((statuses) => [...new Set(statuses)]);

/** Ações de domínio da OS (P-01 / ADR-016 / D-4 / R5b). */
export type WorkOrderAction =
  | 'iniciar'
  | 'concluir'
  | 'cancelar'
  | 'reabrir'
  | 'corrigir'
  | 'aguardar_pagamento'
  | 'receber_pagamento'
  | 'acionar_garantia';

/**
 * Ações disponíveis em cada estado (antes do filtro por empresa). Estados
 * pós-conclusão (DONE/AWAITING_PAYMENT/WARRANTY/CANCELLED) deixam de ser
 * dead-ends: ganham saídas controladas (`reabrir`/`corrigir`, @AdminOnly) e,
 * quando ligados, os status extras.
 */
export const WO_ACTIONS: Record<WorkOrderStatus, readonly WorkOrderAction[]> = {
  PENDING: ['iniciar', 'cancelar'],
  IN_PROGRESS: ['concluir', 'cancelar'],
  DONE: ['reabrir', 'corrigir', 'aguardar_pagamento', 'acionar_garantia'],
  CANCELLED: ['reabrir', 'corrigir'],
  AWAITING_PAYMENT: ['receber_pagamento', 'reabrir', 'corrigir'],
  WARRANTY: ['reabrir', 'corrigir'],
};

/** Estados pós-conclusão: edição genérica bloqueada — só corrigir/reabrir. */
export const WO_CLOSED_STATUSES: readonly WorkOrderStatus[] = [
  'DONE',
  'CANCELLED',
  'AWAITING_PAYMENT',
  'WARRANTY',
];

/** Restritas a OWNER/ADMIN (AC2) — enforced pelo RoleGuard via @AdminOnly no controller. */
export const ADMIN_ONLY_ACTIONS: readonly WorkOrderAction[] = ['reabrir', 'corrigir'];

/** Exigem motivo obrigatório (AC1) — o motivo vai só para o audit trail. */
export const MANDATORY_REASON_ACTIONS: readonly WorkOrderAction[] = [
  'cancelar',
  'reabrir',
  'corrigir',
];

export type StatusAction = Exclude<WorkOrderAction, 'corrigir'>;

export interface StatusActionSpec {
  allowedFrom: WorkOrderStatus[];
  to: WorkOrderStatus;
  /** Ação registrada na trilha de auditoria (AuditLog.action). */
  auditAction: string;
  /** Status extra que a empresa precisa ter ligado (R5b); sem ele a ação fica oculta/bloqueada. */
  requiresExtra?: WorkOrderExtraStatus;
}

/**
 * Especificação de cada ação que muda status (transição + auditoria).
 * Único ponto onde as transições da OS são definidas.
 */
export const STATUS_ACTION_SPECS: Record<StatusAction, StatusActionSpec> = {
  iniciar: { allowedFrom: ['PENDING'], to: 'IN_PROGRESS', auditAction: 'work_order.started' },
  concluir: { allowedFrom: ['IN_PROGRESS'], to: 'DONE', auditAction: 'work_order.completed' },
  cancelar: {
    allowedFrom: ['PENDING', 'IN_PROGRESS'],
    to: 'CANCELLED',
    auditAction: 'work_order.cancelled',
  },
  reabrir: {
    allowedFrom: ['DONE', 'CANCELLED', 'AWAITING_PAYMENT', 'WARRANTY'],
    to: 'IN_PROGRESS',
    auditAction: 'work_order.reopened',
  },
  aguardar_pagamento: {
    allowedFrom: ['DONE'],
    to: 'AWAITING_PAYMENT',
    auditAction: 'work_order.awaiting_payment',
    requiresExtra: 'AWAITING_PAYMENT',
  },
  receber_pagamento: {
    allowedFrom: ['AWAITING_PAYMENT'],
    to: 'DONE',
    auditAction: 'work_order.payment_received',
    requiresExtra: 'AWAITING_PAYMENT',
  },
  acionar_garantia: {
    allowedFrom: ['DONE'],
    to: 'WARRANTY',
    auditAction: 'work_order.warranty_claimed',
    requiresExtra: 'WARRANTY',
  },
};

/**
 * Ações de um estado para os extras ligados na empresa: ações de status extra
 * só aparecem quando a empresa as ativou (`work_order_statuses`).
 */
export function woActionsFor(
  status: WorkOrderStatus,
  enabledExtras: readonly WorkOrderExtraStatus[] = [],
): readonly WorkOrderAction[] {
  return (WO_ACTIONS[status] ?? []).filter((action) => {
    if (!(action in STATUS_ACTION_SPECS)) return true; // corrigir: sem spec de transição
    const spec = STATUS_ACTION_SPECS[action as StatusAction];
    return !spec.requiresExtra || enabledExtras.includes(spec.requiresExtra);
  });
}
