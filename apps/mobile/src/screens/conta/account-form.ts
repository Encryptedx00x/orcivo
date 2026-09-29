export interface AccountFormState {
  name: string;
  email: string;
  current_password: string;
  new_password: string;
  confirm_password: string;
}

export const EMPTY_ACCOUNT_FORM: AccountFormState = {
  name: '',
  email: '',
  current_password: '',
  new_password: '',
  confirm_password: '',
};

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Mirrors the web copy in apps/web/app/(app)/configuracoes/actions.ts (PB1-P33)
// so mobile and web show the same pt-BR message for the same backend status.
export function accountError(error: unknown, action: 'load' | 'save'): string {
  const failure = error as { status?: number; data?: { errors?: unknown } } | null;
  const status = failure?.status;
  if (action === 'load') {
    return status === 401
      ? 'Sua sessão expirou. Entre novamente.'
      : 'Não foi possível carregar seus dados. Verifique sua conexão e tente novamente.';
  }
  if (status === 400) {
    const errors = failure?.data?.errors;
    return Array.isArray(errors) && errors.length > 0 && errors.every((item) => typeof item === 'string')
      ? errors.join(' ')
      : 'Confira os campos e tente novamente.';
  }
  if (status === 401) return 'Sua senha atual está incorreta ou sua sessão expirou.';
  if (status === 409) return 'Este e-mail já está cadastrado.';
  return 'Não foi possível salvar. Verifique sua conexão e tente novamente.';
}
