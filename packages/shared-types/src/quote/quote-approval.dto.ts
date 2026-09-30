import { z } from 'zod';

export const ApproveQuoteSchema = z
  .object({
    approval_method: z.enum(['APPROVE_BUTTON', 'TYPED_NAME', 'DRAWN_SIGNATURE', 'PHOTO_SIGNATURE']),
    typed_name: z.string().min(2).max(200).optional(),
    // A imagem em base64 tem overhead em relacao ao arquivo de 2 MB aceito pelo storage.
    signature: z.string().max(2_800_000).optional(),
  })
  .refine((d) => d.approval_method !== 'TYPED_NAME' || !!d.typed_name, {
    message: 'typed_name obrigatorio para TYPED_NAME',
    path: ['typed_name'],
  })
  .refine(
    (d) => !['DRAWN_SIGNATURE', 'PHOTO_SIGNATURE'].includes(d.approval_method) || !!d.signature,
    {
      message: 'signature obrigatoria para assinatura desenhada ou por foto',
      path: ['signature'],
    },
  );

export type ApproveQuoteDto = z.infer<typeof ApproveQuoteSchema>;
