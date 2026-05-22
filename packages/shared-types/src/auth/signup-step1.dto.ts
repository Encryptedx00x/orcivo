import { z } from 'zod';

export const SignupStep1Schema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  phone: z.string().optional(),
  password: z.string().min(8).max(72),
  accepted_terms: z.literal(true),
});

export type SignupStep1Dto = z.infer<typeof SignupStep1Schema>;
