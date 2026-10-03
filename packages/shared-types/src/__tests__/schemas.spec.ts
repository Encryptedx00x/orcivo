import { SignupStep1Schema, SignupStep2Schema, LoginSchema, CustomerCreateSchema, CustomerListQuerySchema, LEGAL_DOCS_VERSION } from '../index';

describe('SignupStep1Schema', () => {
  it('accepts valid input', () => {
    const result = SignupStep1Schema.safeParse({
      name: 'João Silva',
      email: 'joao@example.com',
      password: 'senha123',
      accepted_terms: true,
    });
    expect(result.success).toBe(true);
  });

  it('rejects password shorter than 8 chars', () => {
    const result = SignupStep1Schema.safeParse({
      name: 'João',
      email: 'joao@example.com',
      password: '1234567',
      accepted_terms: true,
    });
    expect(result.success).toBe(false);
  });

  it('rejects accepted_terms = false', () => {
    const result = SignupStep1Schema.safeParse({
      name: 'João',
      email: 'joao@example.com',
      password: 'senha123',
      accepted_terms: false,
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid email', () => {
    const result = SignupStep1Schema.safeParse({
      name: 'João',
      email: 'not-an-email',
      password: 'senha123',
      accepted_terms: true,
    });
    expect(result.success).toBe(false);
  });
});

describe('SignupStep2Schema', () => {
  it('accepts valid input', () => {
    const result = SignupStep2Schema.safeParse({ trade_name: 'Elétrica Silva' });
    expect(result.success).toBe(true);
  });

  it('rejects invalid brand_color', () => {
    const result = SignupStep2Schema.safeParse({
      trade_name: 'Elétrica Silva',
      brand_color: 'notacolor',
    });
    expect(result.success).toBe(false);
  });

  it('accepts valid hex brand_color', () => {
    const result = SignupStep2Schema.safeParse({
      trade_name: 'Elétrica Silva',
      brand_color: '#6D28D9',
    });
    expect(result.success).toBe(true);
  });

  it('rejects state longer than 2 chars', () => {
    const result = SignupStep2Schema.safeParse({
      trade_name: 'Elétrica Silva',
      state: 'SPA',
    });
    expect(result.success).toBe(false);
  });
});

describe('LoginSchema', () => {
  it('accepts valid credentials', () => {
    const result = LoginSchema.safeParse({ email: 'joao@example.com', password: 'abc' });
    expect(result.success).toBe(true);
  });

  it('rejects invalid email', () => {
    const result = LoginSchema.safeParse({ email: 'notanemail', password: 'abc' });
    expect(result.success).toBe(false);
  });
});

describe('CustomerCreateSchema', () => {
  it('accepts valid customer', () => {
    const result = CustomerCreateSchema.safeParse({ name: 'Cliente Teste' });
    expect(result.success).toBe(true);
  });

  it('rejects empty name', () => {
    const result = CustomerCreateSchema.safeParse({ name: '' });
    expect(result.success).toBe(false);
  });

  it('accepts optional type PF/PJ', () => {
    expect(CustomerCreateSchema.safeParse({ name: 'X', type: 'PF' }).success).toBe(true);
    expect(CustomerCreateSchema.safeParse({ name: 'X', type: 'PJ' }).success).toBe(true);
    expect(CustomerCreateSchema.safeParse({ name: 'X', type: 'OUTRO' as never }).success).toBe(false);
  });
});

describe('CustomerListQuerySchema', () => {
  it('applies defaults', () => {
    const result = CustomerListQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.limit).toBe(20);
    }
  });

  it('rejects limit > 100', () => {
    const result = CustomerListQuerySchema.safeParse({ limit: 200 });
    expect(result.success).toBe(false);
  });
});

describe('SignupStep1Schema — versão legal (paridade web/mobile)', () => {
  const base = {
    name: 'João Silva',
    email: 'joao@example.com',
    password: 'senha123',
    accepted_terms: true,
  };

  it('aceita payload de cliente antigo sem terms_version/privacy_version', () => {
    expect(SignupStep1Schema.safeParse(base).success).toBe(true);
  });

  it('aceita a versão vigente', () => {
    const result = SignupStep1Schema.safeParse({
      ...base,
      terms_version: LEGAL_DOCS_VERSION,
      privacy_version: LEGAL_DOCS_VERSION,
    });
    expect(result.success).toBe(true);
  });

  it('rejeita versão desconhecida', () => {
    expect(SignupStep1Schema.safeParse({ ...base, terms_version: '1999-01-01' }).success).toBe(false);
  });
});
