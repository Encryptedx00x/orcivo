import { z } from 'zod';

/** Optional groups on a receipt. Core proof fields are intentionally not hideable. */
export const ReceiptDocOptionsSchema = z
  .object({
    company_details: z.boolean().optional(),
    client_details: z.boolean().optional(),
    payment_details: z.boolean().optional(),
    additional_info: z.boolean().optional(),
    pix: z.boolean().optional(),
    footer: z.boolean().optional(),
  })
  .strict();

export type ReceiptDocOptions = z.infer<typeof ReceiptDocOptionsSchema>;
export type ResolvedReceiptDocOptions = Required<ReceiptDocOptions>;

/** Old receipts and companies keep the complete document by default. */
export function resolveReceiptDocOptions(raw?: unknown): ResolvedReceiptDocOptions {
  const parsed = ReceiptDocOptionsSchema.safeParse(raw ?? {});
  const options = parsed.success ? parsed.data : {};
  return {
    company_details: options.company_details ?? true,
    client_details: options.client_details ?? true,
    payment_details: options.payment_details ?? true,
    additional_info: options.additional_info ?? true,
    pix: options.pix ?? true,
    footer: options.footer ?? true,
  };
}

export const RECEIPT_DOC_SWITCHES: Array<{
  key: keyof ReceiptDocOptions;
  label: string;
}> = [
  { key: 'company_details', label: 'Contatos e endereço da empresa' },
  { key: 'client_details', label: 'Contato e endereço do cliente' },
  { key: 'payment_details', label: 'Forma de pagamento' },
  { key: 'additional_info', label: 'Informações adicionais' },
  { key: 'pix', label: 'Chave Pix' },
  { key: 'footer', label: 'Frase de rodapé' },
];
