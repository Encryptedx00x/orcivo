import { z } from 'zod';

export const CompanyMembershipSummarySchema = z.object({
  company_id: z.string().uuid(),
  trade_name: z.string(),
  role: z.enum(['OWNER', 'ADMIN', 'TECNICO']),
  active: z.boolean().optional(),
});
export type CompanyMembershipSummaryDto = z.infer<typeof CompanyMembershipSummarySchema>;

export const CompanySelectionRequiredSchema = z.object({
  requires_company_selection: z.literal(true),
  selection_token: z.string(),
  companies: z.array(CompanyMembershipSummarySchema).min(2),
});
export type CompanySelectionRequiredDto = z.infer<typeof CompanySelectionRequiredSchema>;

export const SelectCompanySchema = z.object({
  selection_token: z.string().min(1),
  company_id: z.string().uuid(),
});
export type SelectCompanyDto = z.infer<typeof SelectCompanySchema>;

export const SwitchCompanySchema = z.object({
  company_id: z.string().uuid(),
  refresh_token: z.string().min(1),
});
export type SwitchCompanyDto = z.infer<typeof SwitchCompanySchema>;

export const CreateCompanySchema = z.object({
  trade_name: z.string().trim().min(2).max(120),
});
export type CreateCompanyDto = z.infer<typeof CreateCompanySchema>;
