export function equipeError(error: unknown, action: 'load' | 'invite'): string {
  const failure = error as {
    status?: number;
    message?: string;
    data?: { message?: unknown };
  } | null;
  // The shared GET client includes the status in its Error message; writes expose status/data.
  const status = failure?.status ?? Number(failure?.message?.match(/^GET \S+ (\d{3})$/)?.[1]);
  if (status === 401) return 'Sua sessão expirou. Entre novamente.';
  const message = failure?.data?.message;
  if (status === 403) {
    // Plan limits also use 403. Keep mobile copy neutral and hide internal plan codes.
    if (typeof message === 'string' && message.startsWith('Limite de ')) {
      return 'O limite de membros do plano foi atingido. Consulte o plano da empresa.';
    }
    if (typeof message === 'string' && message.includes('assinatura')) {
      return 'A assinatura da empresa precisa ser regularizada para enviar convites.';
    }
    return 'Somente administradores podem gerenciar a equipe.';
  }
  if (status === 402 || status === 423)
    return 'A assinatura da empresa precisa ser regularizada para enviar convites.';
  if (action === 'invite' && (status === 400 || status === 409)) {
    if (typeof message === 'string' && message.trim()) return message;
    if (
      Array.isArray(message) &&
      message.length &&
      message.every((item) => typeof item === 'string')
    ) {
      return message.join(' ');
    }
    return 'Confira o e-mail e tente novamente.';
  }
  return action === 'load'
    ? 'Não foi possível carregar a equipe. Verifique sua conexão e tente novamente.'
    : 'Não foi possível enviar o convite. Verifique sua conexão e tente novamente.';
}
