import {
  CompanyPreferencesSchema,
  NeutralTermSchema,
  RequiredNeutralTermSchema,
  resolveCompanyTerminology,
} from './company-preferences';

describe('preferências neutras da empresa', () => {
  it('resolve defaults sem inferir profissão', () => {
    expect(resolveCompanyTerminology({})).toEqual({
      serviceOwner: 'Responsável',
      serviceOwnerLong: 'Responsável pelo serviço',
      signatureLabel: 'Assinatura',
    });
  });

  it('normaliza termos personalizados seguros', () => {
    expect(
      resolveCompanyTerminology({
        service_owner_term: '  Profissional   designado  ',
        document_professional_term: 'Arquiteto responsável',
      }),
    ).toEqual({
      serviceOwner: 'Profissional designado',
      serviceOwnerLong: 'Profissional designado',
      signatureLabel: 'Arquiteto responsável',
    });
  });

  it('rejeita HTML, termo vazio e nicho outro sem descrição', () => {
    expect(NeutralTermSchema.safeParse('<b>Responsável</b>').success).toBe(false);
    expect(RequiredNeutralTermSchema.safeParse(' ').success).toBe(false);
    expect(CompanyPreferencesSchema.safeParse({ industry_code: 'OTHER' }).success).toBe(false);
  });
});
