import { z } from 'zod';

/**
 * Password re-entry is deliberately required server-side for every credential
 * change. The web form is only a convenience; mobile and direct API clients
 * receive the same protection.
 */
export const AccountUpdateSchema = z
  .object({
    name: z.string().trim().min(2).max(100).optional(),
    email: z.string().trim().toLowerCase().email().optional(),
    current_password: z.string().min(1).max(128).optional(),
    new_password: z.string().min(8).max(72).optional(),
  })
  .superRefine((value, context) => {
    const changingCredentials = value.email !== undefined || value.new_password !== undefined;

    if (value.name === undefined && !changingCredentials) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Informe ao menos um dado para alterar.',
      });
    }

    if (changingCredentials && !value.current_password) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['current_password'],
        message: 'Informe sua senha atual para alterar credenciais.',
      });
    }
  });

export type AccountUpdateDto = z.infer<typeof AccountUpdateSchema>;
