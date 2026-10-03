import { z } from 'zod';
import { SUPPORTED_LEGAL_VERSIONS } from './legal-versions';

export * from './legal-versions';

const legalVersion = z
  .string()
  .refine((v) => SUPPORTED_LEGAL_VERSIONS.includes(v), { message: 'Versão dos termos inválida' });

export const SignupStep1Schema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  phone: z.string().optional(),
  password: z.string().min(8).max(72),
  accepted_terms: z.literal(true),
  // Opcionais: clientes antigos (mobile já publicado) não enviam; o backend assume a versão vigente.
  terms_version: legalVersion.optional(),
  privacy_version: legalVersion.optional(),
});

export type SignupStep1Dto = z.infer<typeof SignupStep1Schema>;
