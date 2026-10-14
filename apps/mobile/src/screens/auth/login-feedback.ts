export interface LoginFeedback {
  title: string;
  message: string;
}

export function describeLoginError(error: unknown): LoginFeedback {
  const status = (error ?? {}) as { status?: number };

  if (status.status === 401) {
    return {
      title: 'Não foi possível entrar',
      message: 'E-mail ou senha inválidos.',
    };
  }

  return {
    title: 'Erro de conexão',
    message: 'Não foi possível entrar agora. Verifique sua conexão e tente novamente.',
  };
}
