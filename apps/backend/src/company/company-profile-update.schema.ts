import { QuoteDocOptionsSchema } from '@orcivo/shared-types';
import { z } from 'zod';

// Mirrors packages/shared-types/src/company/company-profile-update.dto.ts.
// That package's public export (src/index.ts) is owned by a separate change;
// duplicated here so @AdminOnly PATCH /company/me can validate today.

export const PixKeyTypeEnum = z.enum(['CPF', 'CNPJ', 'EMAIL', 'PHONE', 'RANDOM']);
export type PixKeyType = z.infer<typeof PixKeyTypeEnum>;

const onlyDigits = (value: string) => value.replace(/\D/g, '');

export function isValidPixKey(type: PixKeyType, key: string): boolean {
  switch (type) {
    case 'CPF':
      return onlyDigits(key).length === 11;
    case 'CNPJ':
      return onlyDigits(key).length === 14;
    case 'EMAIL':
      return z.string().email().safeParse(key).success;
    case 'PHONE':
      return /^\d{10,11}$/.test(onlyDigits(key));
    case 'RANDOM':
      return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(key);
  }
}

export const CompanyProfileUpdateSchema = z
  .object({
    trade_name: z.string().min(2).max(150).optional(),
    document_type: z.enum(['CPF', 'CNPJ']).nullable().optional(),
    document: z.string().max(20).nullable().optional(),
    phone: z.string().max(20).nullable().optional(),
    city: z.string().max(100).nullable().optional(),
    state: z.string().max(2).nullable().optional(),
    address: z.string().max(200).nullable().optional(),
    pix_key_type: PixKeyTypeEnum.nullable().optional(),
    pix_key: z.string().max(140).nullable().optional(),
    quote_default_terms: z.string().max(2000).nullable().optional(),
    quote_default_validity_days: z.number().int().min(1).max(365).nullable().optional(),
    quote_default_doc_options: QuoteDocOptionsSchema.nullable().optional(),
  })
  .superRefine((data, ctx) => {
    const hasType = data.pix_key_type != null;
    const hasKey = data.pix_key != null && data.pix_key !== '';

    if (hasKey && !hasType) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['pix_key_type'],
        message: 'Informe o tipo da chave Pix.',
      });
      return;
    }
    if (hasType && !hasKey) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['pix_key'],
        message: 'Informe a chave Pix.',
      });
      return;
    }
    if (
      hasType &&
      hasKey &&
      !isValidPixKey(data.pix_key_type as PixKeyType, data.pix_key as string)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['pix_key'],
        message: `Chave Pix inválida para o tipo ${data.pix_key_type}.`,
      });
    }
  });

export type CompanyProfileUpdateDto = z.infer<typeof CompanyProfileUpdateSchema>;

/** At least one method stays on; only the methods the approval page supports. */
export const ApprovalMethodsSchema = z.object({
  methods: z
    .array(z.enum(['APPROVE_BUTTON', 'TYPED_NAME', 'DRAWN_SIGNATURE', 'PHOTO_SIGNATURE']))
    .min(1, 'Pelo menos uma forma de aprovação fica ligada.')
    .max(4)
    .transform((m) => [...new Set(m)]),
});
