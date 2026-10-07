import { z } from 'zod';

/** Title printed on the document (the content is the same quote). */
export const QUOTE_DOC_TITLES = {
  ORCAMENTO: 'Orçamento',
  PROPOSTA: 'Proposta',
  PEDIDO: 'Pedido',
} as const;
export type QuoteDocTitle = keyof typeof QUOTE_DOC_TITLES;

/**
 * What goes on the quote document (PDF and the client's approval link). Every
 * switch defaults to shown; the company keeps a default and each quote can change it.
 */
export const QuoteDocOptionsSchema = z
  .object({
    title: z.enum(['ORCAMENTO', 'PROPOSTA', 'PEDIDO']).optional(),
    /** Unit price and line total of each item. */
    item_prices: z.boolean().optional(),
    /** Subtotal and discount lines. */
    subtotal: z.boolean().optional(),
    total: z.boolean().optional(),
    validity: z.boolean().optional(),
    /** Conditions / notes text. */
    terms: z.boolean().optional(),
    pix: z.boolean().optional(),
  })
  .strict();
export type QuoteDocOptions = z.infer<typeof QuoteDocOptionsSchema>;
export type ResolvedQuoteDocOptions = Required<QuoteDocOptions>;

/** Fills the defaults (everything shown, title "Orçamento"); tolerates bad stored JSON. */
export function resolveQuoteDocOptions(raw?: unknown): ResolvedQuoteDocOptions {
  const parsed = QuoteDocOptionsSchema.safeParse(raw ?? {});
  const o = parsed.success ? parsed.data : {};
  return {
    title: o.title ?? 'ORCAMENTO',
    item_prices: o.item_prices ?? true,
    subtotal: o.subtotal ?? true,
    total: o.total ?? true,
    validity: o.validity ?? true,
    terms: o.terms ?? true,
    pix: o.pix ?? true,
  };
}

/** Labels for the switches (same wording on every surface). */
export const QUOTE_DOC_SWITCHES: Array<{
  key: Exclude<keyof QuoteDocOptions, 'title'>;
  label: string;
}> = [
  { key: 'item_prices', label: 'Preço de cada item' },
  { key: 'subtotal', label: 'Subtotal e desconto' },
  { key: 'total', label: 'Valor total' },
  { key: 'validity', label: 'Validade' },
  { key: 'terms', label: 'Condições' },
  { key: 'pix', label: 'Chave Pix' },
];
