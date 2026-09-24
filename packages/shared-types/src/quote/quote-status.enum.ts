export type QuoteStatus = 'DRAFT' | 'SENT' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'EXPIRED';
export type DiscountType = 'PERCENT' | 'FIXED';

/**
 * Ações de domínio de Quote (PB1-P01 / ADR-016): o ÚNICO caminho para o
 * status de um orçamento mudar — não existe `<select>` de status livre.
 * Cada ação valida o estado de origem antes de qualquer escrita (AC1) e
 * transições inválidas são rejeitadas com erro claro (AC5).
 */
export type QuoteAction =
  | 'enviar'
  | 'aprovar'
  | 'recusar'
  | 'cancelar'
  | 'reabrir'
  | 'corrigir'
  | 'expirar';

/** Especificação de uma ação de domínio na máquina de estados. */
export interface QuoteActionSpec {
  /** Estado resultante da ação. */
  to: QuoteStatus;
  /** Estados de origem válidos para a ação. */
  allowedFrom: readonly QuoteStatus[];
  /** Motivo obrigatório — vai SÓ para o audit trail, nunca sobrescreve dados (AC3). */
  requiresReason: boolean;
  /** Restrita a OWNER/ADMIN — enforced pelo RoleGuard via @AdminOnly no controller (AC2). */
  adminOnly: boolean;
}

/**
 * Máquina de estados de Quote por ação de domínio. Substitui as transições
 * forward-only: os estados terminais (APPROVED/REJECTED/CANCELLED/EXPIRED)
 * deixam de ser dead-ends absolutos e ganham saídas CONTROLADAS — `reabrir`
 * (→ SENT, nova rodada de aprovação) e `corrigir` (→ DRAFT, ajuste antes de
 * reenviar), ambas @AdminOnly e com motivo obrigatório.
 */
export const QUOTE_ACTIONS: Record<QuoteAction, QuoteActionSpec> = {
  enviar: { to: 'SENT', allowedFrom: ['DRAFT'], requiresReason: false, adminOnly: false },
  aprovar: { to: 'APPROVED', allowedFrom: ['SENT'], requiresReason: false, adminOnly: false },
  recusar: { to: 'REJECTED', allowedFrom: ['SENT'], requiresReason: true, adminOnly: false },
  cancelar: {
    to: 'CANCELLED',
    allowedFrom: ['DRAFT', 'SENT'],
    requiresReason: true,
    adminOnly: false,
  },
  expirar: {
    to: 'EXPIRED',
    allowedFrom: ['DRAFT', 'SENT'],
    requiresReason: false,
    adminOnly: false,
  },
  reabrir: {
    to: 'SENT',
    allowedFrom: ['REJECTED', 'EXPIRED', 'CANCELLED'],
    requiresReason: true,
    adminOnly: true,
  },
  corrigir: {
    to: 'DRAFT',
    allowedFrom: ['APPROVED', 'REJECTED', 'EXPIRED', 'CANCELLED'],
    requiresReason: true,
    adminOnly: true,
  },
};

/**
 * Porta única de validação de uma ação de domínio: lança Error com mensagem
 * clara (AC5) quando o estado de origem não é válido para a ação.
 */
export function assertValidQuoteAction(action: QuoteAction, from: QuoteStatus): QuoteActionSpec {
  const spec = QUOTE_ACTIONS[action];
  if (!spec) {
    throw new Error(`Ação de domínio desconhecida: ${action}`);
  }
  if (!spec.allowedFrom.includes(from)) {
    throw new Error(`Transição inválida: ${from} → ${spec.to} (${action})`);
  }
  return spec;
}

/**
 * Ações de domínio disponíveis no estado para o papel dado. Sem papel admin,
 * as ações @AdminOnly (reabrir/corrigir) ficam de fora (AC2).
 */
export function quoteAllowedActions(status: QuoteStatus, isAdmin = false): QuoteAction[] {
  return (Object.keys(QUOTE_ACTIONS) as QuoteAction[]).filter((action) => {
    const spec = QUOTE_ACTIONS[action];
    if (spec.adminOnly && !isAdmin) return false;
    return spec.allowedFrom.includes(status);
  });
}

/**
 * Fluxo forward-only (legado): descreve o caminho normal de negócio, SEM as
 * saídas admin-controladas dos estados terminais — que existem apenas como
 * ações de domínio em QUOTE_ACTIONS. `isTerminalStatus` continua significando
 * "sem saída no fluxo normal" (a saída controlada é reabrir/corrigir).
 */
export const VALID_TRANSITIONS: Record<QuoteStatus, QuoteStatus[]> = {
  DRAFT: ['SENT', 'CANCELLED', 'EXPIRED'],
  SENT: ['APPROVED', 'REJECTED', 'CANCELLED', 'EXPIRED'],
  APPROVED: [],
  REJECTED: [],
  CANCELLED: [],
  EXPIRED: [],
};

export function assertValidTransition(from: QuoteStatus, to: QuoteStatus): void {
  if (!VALID_TRANSITIONS[from]?.includes(to)) {
    throw new Error(`Transição inválida: ${from} → ${to}`);
  }
}

export function isTerminalStatus(status: QuoteStatus): boolean {
  return VALID_TRANSITIONS[status].length === 0;
}
