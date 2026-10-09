// Derivação de UI dos status extras da OS (R5b) — as transições, labels e a
// máquina de estados vêm do shared-types/backend; nada é duplicado aqui.
import {
  WO_CLOSED_STATUSES,
  WORK_ORDER_STATUS_LABELS,
  woActionsFor,
  type WorkOrderAction,
  type WorkOrderStatus,
} from '@orcivo/shared-types';
import type { ChipKind } from '../../easy/ui';

export type { WorkOrderAction, WorkOrderStatus };

/** Ações de status extra (R5b) — copy pt-BR, confirmação e pós-ação. */
export type WorkOrderExtraAction = 'aguardar_pagamento' | 'receber_pagamento' | 'acionar_garantia';

export const EXTRA_ACTION_UI: Record<
  WorkOrderExtraAction,
  {
    label: string;
    sub: string;
    question: string;
    confirm: string;
    doneEasy: string;
    doneFull: string;
  }
> = {
  aguardar_pagamento: {
    label: 'Aguardando pagamento',
    sub: 'Serviço feito, falta receber',
    question: 'Marcar esta OS como aguardando pagamento?',
    confirm: 'Sim, aguardar',
    doneEasy: 'Serviço aguardando pagamento.',
    doneFull: 'OS aguardando pagamento.',
  },
  receber_pagamento: {
    label: 'Receber pagamento',
    sub: 'Conclui o serviço de vez',
    question: 'Confirmar o pagamento desta OS?',
    confirm: 'Sim, receber',
    doneEasy: 'Pagamento recebido — serviço concluído.',
    doneFull: 'Pagamento recebido — OS concluída.',
  },
  acionar_garantia: {
    label: 'Acionar garantia',
    sub: 'O cliente acionou a garantia',
    question: 'Acionar a garantia desta OS?',
    confirm: 'Sim, acionar',
    doneEasy: 'Garantia acionada.',
    doneFull: 'Garantia acionada.',
  },
};

export const isExtraAction = (a: WorkOrderAction): a is WorkOrderExtraAction =>
  a in EXTRA_ACTION_UI;

/** Cores dos badges do app completo (fundo sólido); o label vem do shared-types. */
export const STATUS_COLORS: Record<WorkOrderStatus, { color: string; bg: string }> = {
  PENDING: { color: '#374151', bg: '#F3F4F6' },
  IN_PROGRESS: { color: '#FFFFFF', bg: '#2563EB' },
  DONE: { color: '#FFFFFF', bg: '#16A34A' },
  CANCELLED: { color: '#FFFFFF', bg: '#DC2626' },
  AWAITING_PAYMENT: { color: '#FFFFFF', bg: '#1E40AF' },
  WARRANTY: { color: '#FFFFFF', bg: '#6D28D9' },
};

/**
 * Modo fácil: os 4 status base no linguagem do modo; os status extras (R5b)
 * usam o label publicado no shared-types (regra única).
 */
export const EASY_STATUS: Record<WorkOrderStatus, { kind: ChipKind; label: string }> = {
  PENDING: { kind: 'wait', label: 'Para fazer' },
  IN_PROGRESS: { kind: 'doing', label: 'Fazendo' },
  DONE: { kind: 'ok', label: 'Feito' },
  CANCELLED: { kind: 'draft', label: 'Cancelado' },
  AWAITING_PAYMENT: { kind: 'wait', label: WORK_ORDER_STATUS_LABELS.AWAITING_PAYMENT },
  WARRANTY: { kind: 'doing', label: WORK_ORDER_STATUS_LABELS.WARRANTY },
};

/**
 * Ações que a tela oferece (AC4): `allowed_actions` do backend manda a lista
 * calculada por estado + papel + status extras da empresa. Sem o campo, cai na
 * regra publicada do shared-types (extras desligados, sem corrigir — o app
 * não expõe correção).
 */
export function woScreenActions(
  status: WorkOrderStatus,
  allowedActions?: readonly WorkOrderAction[],
): readonly WorkOrderAction[] {
  return allowedActions ?? woActionsFor(status).filter((a) => a !== 'corrigir');
}

/** Estados pós-conclusão (edição genérica bloqueada) — lista do shared-types. */
export function woIsClosed(status: WorkOrderStatus): boolean {
  return WO_CLOSED_STATUSES.includes(status);
}
