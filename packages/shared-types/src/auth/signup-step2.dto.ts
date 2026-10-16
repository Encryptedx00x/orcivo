import { z } from 'zod';
import {
  CompanyIndustrySchema,
  NeutralTermSchema,
  OnboardingGoalSchema,
} from '../company/company-preferences';

export const SignupStep2Schema = z
  .object({
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
    industry_code: CompanyIndustrySchema.nullable().optional(),
    industry_other: z.string().trim().max(80).nullable().optional(),
    onboarding_goals: z.array(OnboardingGoalSchema).max(6).optional(),
    profession_title: NeutralTermSchema.nullable().optional(),
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

export type SignupStep2Dto = z.infer<typeof SignupStep2Schema>;
