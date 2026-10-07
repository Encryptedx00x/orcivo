// Recibos: shared types and labels for the full and easy screens. A receipt is
// a PAID payment with a per-company receipt_number (see backend PaymentService).
import { formatMoney } from '@orcivo/shared-types';

export interface Receipt {
  id: string;
  receipt_number: number;
  amount: string;
  method: string | null;
  description: string | null;
  paid_at: string | null;
  created_at: string;
  receipt_signature_key: string | null;
  receipt_signer_name: string | null;
  /** Short-lived URL of the frozen signature (detail endpoint only). */
  receipt_signature_url?: string | null;
  customer: {
    id: string;
    name: string;
    phone?: string | null;
    tax_id?: string | null;
    street?: string | null;
    number?: string | null;
    neighborhood?: string | null;
    city?: string | null;
    state?: string | null;
  };
  work_order: { id: string; number: number; title?: string | null } | null;
  quote: { id: string; number: number; title?: string | null } | null;
}

export const RECEIPT_METHODS = [
  { value: 'PIX', label: 'Pix' },
  { value: 'DINHEIRO', label: 'Dinheiro' },
  { value: 'CARTAO', label: 'Cartão' },
  { value: 'TRANSFERENCIA', label: 'Transferência' },
  { value: 'BOLETO', label: 'Boleto' },
  { value: 'OUTRO', label: 'Outro' },
];

export const methodLabel = (m: string | null): string =>
  RECEIPT_METHODS.find((x) => x.value === m)?.label ?? 'Não informado';

export const receiptNo = (n: number): string => String(n).padStart(4, '0');

export const receiptOrigin = (r: Pick<Receipt, 'work_order' | 'quote'>): string =>
  r.work_order
    ? `Serviço #${r.work_order.number}`
    : r.quote
      ? `Orçamento #${r.quote.number}`
      : 'Avulso';

/** Same "referente a" text the PDF prints. */
export function receiptRef(r: Pick<Receipt, 'description' | 'work_order' | 'quote'>): string {
  const origin = r.work_order
    ? `Serviço #${r.work_order.number}`
    : r.quote
      ? `Orçamento #${r.quote.number}`
      : null;
  if (r.description && origin) return `${r.description} (${origin})`;
  return r.description || origin || 'serviços prestados';
}

export const receiptDate = (r: Pick<Receipt, 'paid_at' | 'created_at'>): string =>
  new Date(r.paid_at ?? r.created_at).toLocaleDateString('pt-BR');

export const receiptPdfUrl = (id: string, download = false): string =>
  `/api/receipt?id=${encodeURIComponent(id)}${download ? '&download=1' : ''}`;

/** WhatsApp text for a receipt (the PDF itself goes by the share sheet when available). */
export function receiptMessage(r: Receipt): string {
  return (
    `Olá! Segue o recibo nº ${receiptNo(r.receipt_number)} de ${formatMoney(r.amount)}, ` +
    `referente a ${receiptRef(r)}. Pago via ${methodLabel(r.method)} em ${receiptDate(r)}.`
  );
}

export function whatsappTextLink(phone: string | null | undefined, text: string): string {
  const digits = (phone ?? '').replace(/\D/g, '');
  const to = digits ? `55${digits.replace(/^55(?=\d{10,11}$)/, '')}` : '';
  return `https://wa.me/${to}?text=${encodeURIComponent(text)}`;
}

/**
 * Sends the receipt: on phones that can share files, the PDF goes through the
 * system share sheet (WhatsApp included); otherwise WhatsApp opens with the text.
 */
export async function shareReceipt(r: Receipt): Promise<'shared' | 'whatsapp'> {
  const name = `recibo-${receiptNo(r.receipt_number)}.pdf`;
  try {
    const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
    if (nav.share && nav.canShare && window.matchMedia('(pointer: coarse)').matches) {
      const blob = await (await fetch(receiptPdfUrl(r.id))).blob();
      const file = new File([blob], name, { type: 'application/pdf' });
      if (nav.canShare({ files: [file] })) {
        await nav.share({ files: [file], text: receiptMessage(r) });
        return 'shared';
      }
    }
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') return 'shared';
  }
  window.open(whatsappTextLink(r.customer.phone, receiptMessage(r)), '_blank', 'noopener');
  return 'whatsapp';
}
