import { z } from 'zod';

export const SignupStep2Schema = z.object({
  trade_name: z.string().min(2).max(100),
  document_type: z.enum(['CPF', 'CNPJ']).optional(),
  document: z.string().optional(),
  phone: z.string().optional(),
  city: z.string().optional(),
  state: z.string().length(2).toUpperCase().optional(),
  brand_color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
  pix_key: z.string().optional(),
});

export type SignupStep2Dto = z.infer<typeof SignupStep2Schema>;
