export type PixKeyType = 'CPF' | 'CNPJ' | 'EMAIL' | 'PHONE' | 'RANDOM';

export interface CompanyProfile {
  trade_name: string;
  document: string;
  phone: string;
  city: string;
  state: string;
}

export type CompanyResponse = {
  [K in keyof CompanyProfile]?: string | null;
} & { pix_key?: string | null };

export const PIX_TYPES: { value: PixKeyType; label: string; placeholder: string }[] = [
  { value: 'CNPJ', label: 'CNPJ', placeholder: '12.345.678/0001-90' },
  { value: 'CPF', label: 'CPF', placeholder: '123.456.789-00' },
  { value: 'EMAIL', label: 'E-mail', placeholder: 'financeiro@empresa.com' },
  { value: 'PHONE', label: 'Telefone', placeholder: '(11) 91234-5678' },
  { value: 'RANDOM', label: 'Aleatória', placeholder: '123e4567-e89b-12d3-a456-426614174000' },
];

export function profileFromCompany(company: CompanyResponse): CompanyProfile {
  return {
    trade_name: company.trade_name ?? '',
    document: company.document ?? '',
    phone: company.phone ?? '',
    city: company.city ?? '',
    state: company.state ?? '',
  };
}

export function profilePayload(profile: CompanyProfile) {
  return {
    trade_name: profile.trade_name.trim(),
    document: profile.document.trim() || null,
    phone: profile.phone.trim() || null,
    city: profile.city.trim() || null,
    state: profile.state.trim().toUpperCase() || null,
  };
}

// The API persists the formatted key, but not its type. Bare 11-digit legacy
// keys are ambiguous; retain the web's CPF fallback in that case.
export function inferPixKeyType(key: string): PixKeyType {
  if (!key) return 'CNPJ';
  if (/^[^@]+@[^@]+\.[^@]+$/.test(key)) return 'EMAIL';
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(key)) return 'RANDOM';
  if (/^\(\d{2}\)/.test(key)) return 'PHONE';
  const digits = key.replace(/\D/g, '');
  if (digits.length === 11) return 'CPF';
  if (digits.length === 14) return 'CNPJ';
  return 'PHONE';
}

// Keep the input masks aligned with PB1-P32 on web. Email and random keys
// remain verbatim; the server validates the selected type on save.
export function maskPixKey(type: PixKeyType, raw: string): string {
  if (type === 'CNPJ') {
    return raw.replace(/\D/g, '').slice(0, 14)
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  }
  if (type === 'CPF') {
    return raw.replace(/\D/g, '').slice(0, 11)
      .replace(/^(\d{3})(\d)/, '$1.$2')
      .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1-$2');
  }
  if (type === 'PHONE') {
    return raw.replace(/\D/g, '').slice(0, 11)
      .replace(/^(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2');
  }
  return raw;
}

export function saveError(error: unknown): string {
  const failure = error as { status?: number; data?: { errors?: unknown } } | null;
  if (failure?.status === 400) {
    const errors = failure.data?.errors;
    return Array.isArray(errors) && errors.every((item) => typeof item === 'string')
      ? errors.join(' ') || 'Confira os campos e tente novamente.'
      : 'Confira os campos e tente novamente.';
  }
  if (failure?.status === 401) return 'Sua sessão expirou. Entre novamente.';
  if (failure?.status === 403) return 'Você não tem permissão para alterar os dados da empresa.';
  if (failure?.status === 404) return 'Empresa não encontrada. Tente carregar novamente.';
  return 'Não foi possível salvar. Verifique sua conexão e tente novamente.';
}
