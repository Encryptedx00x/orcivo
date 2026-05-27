import { z } from 'zod';

export const CreateInviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(['ADMIN', 'TECNICO']).default('TECNICO'),
});
export type CreateInviteDto = z.infer<typeof CreateInviteSchema>;

export const AcceptInviteSchema = z.object({
  token: z.string().uuid(),
  name: z.string().min(2).optional(),
  password: z.string().min(8).optional(),
});
export type AcceptInviteDto = z.infer<typeof AcceptInviteSchema>;
