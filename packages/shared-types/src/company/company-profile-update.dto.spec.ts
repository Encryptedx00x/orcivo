import { CompanyProfileUpdateSchema, isValidPixKey } from './company-profile-update.dto';

describe('CompanyProfileUpdateSchema', () => {
  it('accepts a profile-only update with no pix fields', () => {
    const result = CompanyProfileUpdateSchema.safeParse({
      trade_name: 'Elétrica Silva',
      document_type: 'CNPJ',
      document: '12345678000190',
      phone: '11999998888',
      city: 'São Paulo',
      state: 'SP',
    });
    expect(result.success).toBe(true);
  });

  it('accepts a valid CPF pix key', () => {
    const result = CompanyProfileUpdateSchema.safeParse({
      pix_key_type: 'CPF',
      pix_key: '12345678901',
    });
    expect(result.success).toBe(true);
  });

  it('accepts a valid CNPJ pix key', () => {
    const result = CompanyProfileUpdateSchema.safeParse({
      pix_key_type: 'CNPJ',
      pix_key: '12345678000190',
    });
    expect(result.success).toBe(true);
  });

  it('rejects a CPF pix key with wrong length', () => {
    const result = CompanyProfileUpdateSchema.safeParse({
      pix_key_type: 'CPF',
      pix_key: '123',
    });
    expect(result.success).toBe(false);
  });

  it('accepts a valid EMAIL pix key', () => {
    const result = CompanyProfileUpdateSchema.safeParse({
      pix_key_type: 'EMAIL',
      pix_key: 'pagamentos@empresa.com',
    });
    expect(result.success).toBe(true);
  });

  it('rejects an EMAIL pix key with invalid format', () => {
    const result = CompanyProfileUpdateSchema.safeParse({
      pix_key_type: 'EMAIL',
      pix_key: 'not-an-email',
    });
    expect(result.success).toBe(false);
  });

  it('accepts a valid PHONE pix key', () => {
    const result = CompanyProfileUpdateSchema.safeParse({
      pix_key_type: 'PHONE',
      pix_key: '11999998888',
    });
    expect(result.success).toBe(true);
  });

  it('accepts a valid RANDOM pix key (uuid)', () => {
    const result = CompanyProfileUpdateSchema.safeParse({
      pix_key_type: 'RANDOM',
      pix_key: '123e4567-e89b-12d3-a456-426614174000',
    });
    expect(result.success).toBe(true);
  });

  it('rejects a RANDOM pix key that is not a uuid', () => {
    const result = CompanyProfileUpdateSchema.safeParse({
      pix_key_type: 'RANDOM',
      pix_key: 'not-a-uuid',
    });
    expect(result.success).toBe(false);
  });

  it('rejects pix_key without pix_key_type', () => {
    const result = CompanyProfileUpdateSchema.safeParse({ pix_key: '12345678901' });
    expect(result.success).toBe(false);
  });

  it('rejects pix_key_type without pix_key', () => {
    const result = CompanyProfileUpdateSchema.safeParse({ pix_key_type: 'CPF' });
    expect(result.success).toBe(false);
  });
});

describe('isValidPixKey', () => {
  it('validates each key type independently', () => {
    expect(isValidPixKey('CPF', '12345678901')).toBe(true);
    expect(isValidPixKey('CPF', '123.456.789-01')).toBe(true);
    expect(isValidPixKey('CNPJ', '12.345.678/0001-90')).toBe(true);
    expect(isValidPixKey('EMAIL', 'a@b.com')).toBe(true);
    expect(isValidPixKey('PHONE', '(11) 99999-8888')).toBe(true);
    expect(isValidPixKey('RANDOM', '123e4567-e89b-12d3-a456-426614174000')).toBe(true);
    expect(isValidPixKey('RANDOM', '123')).toBe(false);
  });
});
