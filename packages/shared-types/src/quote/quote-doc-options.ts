import { z } from 'zod';

/** Title printed on the document (the content is the same quote). */
export const QUOTE_DOC_TITLES = {
  ORCAMENTO: 'Orçamento',
  PROPOSTA: 'Proposta',
  PEDIDO: 'Pedido',
  CONTRATO: 'Contrato de serviço',
  ORDEM_SERVICO: 'Ordem de serviço',
  LAUDO: 'Laudo técnico',
} as const;
export type QuoteDocTitle = keyof typeof QUOTE_DOC_TITLES;

/** Titles that take "a" in Portuguese (a proposta, a ordem de serviço). */
export const isFeminineDocTitle = (title?: QuoteDocTitle | null): boolean =>
  title === 'PROPOSTA' || title === 'ORDEM_SERVICO';

/** Accent color of the document (header, totals). Purple is the Orcivo default. */
export const QUOTE_DOC_COLORS = {
  ROXO: { label: 'Roxo', hex: '#6D28D9' },
  AZUL: { label: 'Azul', hex: '#1D4ED8' },
  VERDE: { label: 'Verde', hex: '#15803D' },
  LARANJA: { label: 'Laranja', hex: '#C2410C' },
  VERMELHO: { label: 'Vermelho', hex: '#B91C1C' },
  GRAFITE: { label: 'Grafite', hex: '#334155' },
} as const;
export type QuoteDocColor = keyof typeof QUOTE_DOC_COLORS;

const TITLE_KEYS = Object.keys(QUOTE_DOC_TITLES) as [QuoteDocTitle, ...QuoteDocTitle[]];
const COLOR_KEYS = Object.keys(QUOTE_DOC_COLORS) as [QuoteDocColor, ...QuoteDocColor[]];

/**
 * What goes on the quote document (PDF and the client's approval link). Every
 * switch defaults to shown; the company keeps a default and each quote can change it.
 */
export const QuoteDocOptionsSchema = z
  .object({
    title: z.enum(TITLE_KEYS).optional(),
    color: z.enum(COLOR_KEYS).optional(),
    /** Client phone, e-mail, document and address under "Para". */
    client_details: z.boolean().optional(),
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
    color: o.color ?? 'ROXO',
    client_details: o.client_details ?? true,
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
  key: Exclude<keyof QuoteDocOptions, 'title' | 'color'>;
  label: string;
}> = [
  { key: 'client_details', label: 'Contato e endereço do cliente' },
  { key: 'item_prices', label: 'Preço de cada item' },
  { key: 'subtotal', label: 'Subtotal e desconto' },
  { key: 'total', label: 'Valor total' },
  { key: 'validity', label: 'Validade' },
  { key: 'terms', label: 'Condições' },
  { key: 'pix', label: 'Chave Pix' },
];
