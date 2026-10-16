import { z } from 'zod';
import { NeutralTermSchema, SalutationSchema } from '@orcivo/shared-types';

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
    salutation: SalutationSchema.optional(),
    salutation_custom: NeutralTermSchema.nullable().optional(),
  })
  .superRefine((value, context) => {
    const changingCredentials = value.email !== undefined || value.new_password !== undefined;

    if (
      value.name === undefined &&
      value.salutation === undefined &&
      value.salutation_custom === undefined &&
      !changingCredentials
    ) {
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
    if (value.salutation === 'CUSTOM' && !value.salutation_custom?.trim()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['salutation_custom'],
        message: 'Informe como deseja ser chamado.',
      });
    }
  });

export type AccountUpdateDto = z.infer<typeof AccountUpdateSchema>;
