import Decimal from 'decimal.js';
import { z } from 'zod';

/**
 * How the client pays a quote. Printed as a sentence on the document and, when the
 * quote is approved, turned into receivables (see buildPaymentSchedule).
 */
export const QuotePaymentTermsSchema = z
  .object({
    kind: z.enum(['A_VISTA', 'ENTRADA', 'PARCELADO']),
    /** ENTRADA: share paid up front (%). */
    upfront_percent: z.number().int().min(1).max(99).optional(),
    /** ENTRADA: the rest on completion or in installments. */
    rest: z.enum(['CONCLUSAO', 'PARCELAS']).optional(),
    /** PARCELADO, or ENTRADA + PARCELAS: number of monthly installments. */
    installments: z.number().int().min(2).max(24).optional(),
  })
  .strict()
  .superRefine((t, ctx) => {
    if (t.kind === 'ENTRADA' && (!t.upfront_percent || !t.rest))
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Informe a entrada e o restante.' });
    const needsInstallments =
      t.kind === 'PARCELADO' || (t.kind === 'ENTRADA' && t.rest === 'PARCELAS');
    if (needsInstallments && !t.installments)
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Informe o número de parcelas.' });
  });
export type QuotePaymentTerms = z.infer<typeof QuotePaymentTermsSchema>;

/** Sentence for the PDF and the approval link. */
export function describePaymentTerms(t: QuotePaymentTerms | null | undefined): string | null {
  if (!t) return null;
  if (t.kind === 'A_VISTA') return 'Pagamento à vista.';
  if (t.kind === 'PARCELADO') return `Pagamento em ${t.installments} parcelas mensais.`;
  const rest =
    t.rest === 'PARCELAS' ? `em ${t.installments} parcelas mensais` : 'na conclusão do serviço';
  return `Entrada de ${t.upfront_percent}% na aprovação e o restante ${rest}.`;
}

export interface ScheduledPayment {
  /** String decimal with 2 places. */
  amount: string;
  description: string;
  /** null = due when the service is completed. */
  due_date: Date | null;
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

/** Splits `amount` in `n` parts with 2 decimals; the last absorbs the rounding (sum is exact). */
function split(amount: Decimal, n: number): Decimal[] {
  const part = amount.div(n).toDecimalPlaces(2, Decimal.ROUND_DOWN);
  const parts = Array.from({ length: n }, () => part);
  parts[n - 1] = amount.minus(part.mul(n - 1));
  return parts;
}

/**
 * Receivables created when a quote with these terms is approved. Amounts always add up to
 * `total` exactly. Installments are monthly from the approval date; the first one is due
 * on approval for PARCELADO, one month later when it follows a down payment.
 */
export function buildPaymentSchedule(
  total: string,
  t: QuotePaymentTerms | null | undefined,
  approvedAt: Date,
  label: string,
): ScheduledPayment[] {
  const sum = new Decimal(total);
  if (!t || sum.lte(0)) return [];
  if (t.kind === 'A_VISTA')
    return [{ amount: sum.toFixed(2), description: label, due_date: approvedAt }];
  if (t.kind === 'PARCELADO') {
    const n = t.installments ?? 2;
    return split(sum, n).map((amount, i) => ({
      amount: amount.toFixed(2),
      description: `${label} · parcela ${i + 1}/${n}`,
      due_date: addMonths(approvedAt, i),
    }));
  }
  const upfront = sum
    .mul(t.upfront_percent ?? 0)
    .div(100)
    .toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  const rest = sum.minus(upfront);
  const out: ScheduledPayment[] = [
    { amount: upfront.toFixed(2), description: `${label} · entrada`, due_date: approvedAt },
  ];
  if (rest.lte(0)) return out;
  if (t.rest === 'PARCELAS') {
    const n = t.installments ?? 2;
    split(rest, n).forEach((amount, i) =>
      out.push({
        amount: amount.toFixed(2),
        description: `${label} · parcela ${i + 1}/${n}`,
        due_date: addMonths(approvedAt, i + 1),
      }),
    );
  } else {
    out.push({
      amount: rest.toFixed(2),
      description: `${label} · restante na conclusão`,
      due_date: null,
    });
  }
  return out;
}
