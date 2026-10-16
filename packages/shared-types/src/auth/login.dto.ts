import { z } from 'zod';
import { CompanySelectionRequiredSchema } from './multicompany.dto';

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export type LoginDto = z.infer<typeof LoginSchema>;

export const LoginResponseSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  user: z.object({ id: z.string(), name: z.string(), email: z.string() }),
  company: z.object({ id: z.string(), trade_name: z.string() }),
});

export type LoginResponseDto = z.infer<typeof LoginResponseSchema>;

export const LoginResultSchema = z.union([LoginResponseSchema, CompanySelectionRequiredSchema]);
export type LoginResultDto = z.infer<typeof LoginResultSchema>;
