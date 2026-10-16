import { z } from 'zod';

export const CompanyIndustrySchema = z.enum([
  'GENERAL_SERVICES',
  'INSTALLATION',
  'MAINTENANCE',
  'TECHNICAL_ASSISTANCE',
  'CONSTRUCTION_RENOVATION',
  'AUTOMOTIVE',
  'BEAUTY_WELLNESS',
  'EVENTS',
  'OTHER',
]);
export type CompanyIndustry = z.infer<typeof CompanyIndustrySchema>;

export const OnboardingGoalSchema = z.enum([
  'MANAGE_CUSTOMERS',
  'CREATE_QUOTES',
  'ORGANIZE_SERVICES',
  'CONTROL_RECEIVABLES',
  'MANAGE_PRODUCTS',
  'WORK_WITH_TEAM',
]);
export type OnboardingGoal = z.infer<typeof OnboardingGoalSchema>;

export const SalutationSchema = z.enum(['NONE', 'SR', 'SRA', 'CUSTOM']);
export type Salutation = z.infer<typeof SalutationSchema>;

export const NeutralTermSchema = z
  .string()
  .trim()
  .max(40)
  .refine((value) => !/[<>]/.test(value), 'Não use HTML no termo.')
  .transform((value) => value.replace(/\s+/g, ' '));
export const RequiredNeutralTermSchema = NeutralTermSchema.refine(
  (value) => value.length >= 2,
  'Informe ao menos 2 caracteres.',
);

export const CompanyPreferencesSchema = z
  .object({
    industry_code: CompanyIndustrySchema.nullable().optional(),
    industry_other: z.string().trim().max(80).nullable().optional(),
    onboarding_goals: z.array(OnboardingGoalSchema).max(6).optional(),
    service_owner_term: RequiredNeutralTermSchema.optional(),
    document_professional_term: NeutralTermSchema.nullable().optional(),
  })
  .superRefine((value, context) => {
    if (value.industry_code === 'OTHER' && !value.industry_other?.trim()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['industry_other'],
        message: 'Informe o nicho da empresa.',
      });
    }
  });

export function resolveCompanyTerminology(input: {
  service_owner_term?: string | null;
  document_professional_term?: string | null;
}): { serviceOwner: string; serviceOwnerLong: string; signatureLabel: string } {
  const serviceOwner = RequiredNeutralTermSchema.safeParse(input.service_owner_term).success
    ? RequiredNeutralTermSchema.parse(input.service_owner_term)
    : 'Responsável';
  const professional = NeutralTermSchema.safeParse(input.document_professional_term).success
    ? NeutralTermSchema.parse(input.document_professional_term)
    : '';
  return {
    serviceOwner,
    serviceOwnerLong: serviceOwner === 'Responsável' ? 'Responsável pelo serviço' : serviceOwner,
    signatureLabel: professional || 'Assinatura',
  };
}

export const COMPANY_INDUSTRY_LABELS: Record<CompanyIndustry, string> = {
  GENERAL_SERVICES: 'Serviços em geral',
  INSTALLATION: 'Instalação',
  MAINTENANCE: 'Manutenção',
  TECHNICAL_ASSISTANCE: 'Assistência técnica',
  CONSTRUCTION_RENOVATION: 'Construção e reformas',
  AUTOMOTIVE: 'Serviços automotivos',
  BEAUTY_WELLNESS: 'Beleza e bem-estar',
  EVENTS: 'Eventos',
  OTHER: 'Outro',
};

export const ONBOARDING_GOAL_LABELS: Record<OnboardingGoal, string> = {
  MANAGE_CUSTOMERS: 'Organizar clientes',
  CREATE_QUOTES: 'Criar orçamentos',
  ORGANIZE_SERVICES: 'Acompanhar serviços',
  CONTROL_RECEIVABLES: 'Controlar recebimentos',
  MANAGE_PRODUCTS: 'Gerenciar produtos',
  WORK_WITH_TEAM: 'Trabalhar em equipe',
};
