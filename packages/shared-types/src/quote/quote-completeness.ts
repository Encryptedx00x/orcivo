import type { QuoteDocOptions } from './quote-doc-options';
import { resolveQuoteDocOptions } from './quote-doc-options';
import type { QuotePaymentTerms } from './quote-payment-terms';

export const QUOTE_COMPLETENESS_FIELDS = {
  valid_until: {
    label: 'Validade',
    description: 'A data de validade não aparecerá no documento.',
  },
  payment_terms: {
    label: 'Condição de pagamento',
    description: 'O cliente não verá como o pagamento foi combinado.',
  },
  warranty: {
    label: 'Garantia',
    description: 'Nenhuma informação de garantia aparecerá no documento.',
  },
  notes: {
    label: 'Condições e informações adicionais',
    description: 'O documento será gerado sem condições ou observações adicionais.',
  },
} as const;

export type QuoteCompletenessField = keyof typeof QUOTE_COMPLETENESS_FIELDS;

export interface QuoteCompletenessInput {
  valid_until?: string | Date | null;
  payment_terms?: QuotePaymentTerms | null;
  warranty?: string | null;
  notes?: string | null;
  doc_options?: QuoteDocOptions | null;
}

export interface QuoteCompletenessMissingItem {
  field: QuoteCompletenessField;
  label: string;
  description: string;
}

export interface QuoteCompletenessReview {
  complete: boolean;
  missing: QuoteCompletenessMissingItem[];
}

/**
 * Non-blocking review of optional quote content. Required fields stay in the
 * create/update schemas; this only explains what the generated document omits.
 */
export function reviewQuoteCompleteness(input: QuoteCompletenessInput): QuoteCompletenessReview {
  const options = resolveQuoteDocOptions(input.doc_options);
  const missingFields: QuoteCompletenessField[] = [];

  if (options.validity && !input.valid_until) missingFields.push('valid_until');
  if (!input.payment_terms) missingFields.push('payment_terms');
  if (options.terms && !input.warranty?.trim()) missingFields.push('warranty');
  if (options.terms && !input.notes?.trim()) missingFields.push('notes');

  const missing = missingFields.map((field) => ({ field, ...QUOTE_COMPLETENESS_FIELDS[field] }));
  return { complete: missing.length === 0, missing };
}
