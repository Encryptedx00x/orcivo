export function financeiroError(error: unknown, action: 'load' | 'save' | 'settle'): string {
  const failure = error as {
    status?: number;
    message?: string;
    data?: { message?: unknown };
  } | null;
  // The shared GET client includes the status in its Error message; writes expose status/data.
  const status = failure?.status ?? Number(failure?.message?.match(/ (\d{3})$/)?.[1]);
  if (status === 401) return 'Sua sessão expirou. Entre novamente.';
  if (status === 403) return 'Somente administradores podem gerenciar o financeiro.';
  if (action === 'load') {
    return 'Não foi possível carregar os recebimentos. Verifique sua conexão e tente novamente.';
  }
  const message = failure?.data?.message;
  if (status === 400 || status === 404) {
    if (typeof message === 'string' && message.trim()) return message;
    if (
      Array.isArray(message) &&
      message.length &&
      message.every((item) => typeof item === 'string')
    ) {
      return message.join(' ');
    }
    return 'Confira os dados e tente novamente.';
  }
  return action === 'settle'
    ? 'Não foi possível marcar o recebimento como recebido. Verifique sua conexão e tente novamente.'
    : 'Não foi possível registrar o recebimento. Verifique sua conexão e tente novamente.';
}
