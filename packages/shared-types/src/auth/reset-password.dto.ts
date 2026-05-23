import { z } from 'zod';

export const ResetPasswordSchema = z.object({
  token: z.string().uuid(),
  new_password: z.string().min(8).max(128),
});

export type ResetPasswordDto = z.infer<typeof ResetPasswordSchema>;
