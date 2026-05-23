export type QuoteStatus = 'DRAFT' | 'SENT' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'EXPIRED';
export type DiscountType = 'PERCENT' | 'FIXED';

export const VALID_TRANSITIONS: Record<QuoteStatus, QuoteStatus[]> = {
  DRAFT:     ['SENT', 'CANCELLED', 'EXPIRED'],
  SENT:      ['APPROVED', 'REJECTED', 'CANCELLED', 'EXPIRED'],
  APPROVED:  [],
  REJECTED:  [],
  CANCELLED: [],
  EXPIRED:   [],
};

export function assertValidTransition(from: QuoteStatus, to: QuoteStatus): void {
  if (!VALID_TRANSITIONS[from]?.includes(to)) {
    throw new Error(`Transição inválida: ${from} → ${to}`);
  }
}

export function isTerminalStatus(status: QuoteStatus): boolean {
  return VALID_TRANSITIONS[status].length === 0;
}
