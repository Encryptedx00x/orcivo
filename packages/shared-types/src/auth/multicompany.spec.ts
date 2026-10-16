import {
  CompanySelectionRequiredSchema,
  CreateCompanySchema,
  LoginResultSchema,
  SelectCompanySchema,
  SwitchCompanySchema,
} from '../index';

describe('contratos multiempresa', () => {
  const companyId = '11111111-1111-4111-8111-111111111111';

  it('aceita o resultado de login que exige seleção explícita', () => {
    expect(
      LoginResultSchema.parse({
        requires_company_selection: true,
        selection_token: 'selector',
        companies: [
          { company_id: companyId, trade_name: 'Empresa A', role: 'OWNER' },
          {
            company_id: '22222222-2222-4222-8222-222222222222',
            trade_name: 'Empresa B',
            role: 'ADMIN',
          },
        ],
      }),
    ).toEqual(expect.objectContaining({ requires_company_selection: true }));
  });

  it('valida seleção, troca e criação sem aceitar identificadores livres', () => {
    expect(
      SelectCompanySchema.safeParse({ selection_token: 'token', company_id: companyId }).success,
    ).toBe(true);
    expect(
      SwitchCompanySchema.safeParse({
        company_id: companyId,
        refresh_token: 'refresh',
      }).success,
    ).toBe(true);
    expect(CreateCompanySchema.parse({ trade_name: '  Empresa B  ' }).trade_name).toBe('Empresa B');
    expect(CompanySelectionRequiredSchema.safeParse({ companies: [] }).success).toBe(false);
  });
});
