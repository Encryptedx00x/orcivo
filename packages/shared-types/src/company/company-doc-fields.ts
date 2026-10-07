/** Extra company data printed on quotes and receipts (same fields on every settings screen). */
export type CompanyDocFieldKey =
  | 'instagram'
  | 'website'
  | 'professional_registration'
  | 'document_footer';

export const COMPANY_DOC_FIELDS: Array<{
  key: CompanyDocFieldKey;
  label: string;
  placeholder: string;
  max: number;
}> = [
  { key: 'instagram', label: 'Instagram', placeholder: '@suaempresa', max: 60 },
  { key: 'website', label: 'Site', placeholder: 'www.suaempresa.com.br', max: 120 },
  {
    key: 'professional_registration',
    label: 'Registro profissional',
    placeholder: 'Ex.: CREA-SP 123456 ou CFT 12345',
    max: 60,
  },
  {
    key: 'document_footer',
    label: 'Frase no fim dos documentos',
    placeholder: 'Ex.: Agradecemos a preferência!',
    max: 160,
  },
];
