import { z } from 'zod';

export const ApproveQuoteSchema = z
  .object({
    approval_method: z.enum(['APPROVE_BUTTON', 'TYPED_NAME', 'DRAWN_SIGNATURE']),
    typed_name: z.string().min(2).max(200).optional(),
    signature: z.string().max(2_000_000).optional(), // base64 PNG para DRAWN_SIGNATURE (limite 2MB)
  })
  .refine((d) => d.approval_method !== 'TYPED_NAME' || !!d.typed_name, {
    message: 'typed_name obrigatorio para TYPED_NAME',
    path: ['typed_name'],
  });

export type ApproveQuoteDto = z.infer<typeof ApproveQuoteSchema>;
