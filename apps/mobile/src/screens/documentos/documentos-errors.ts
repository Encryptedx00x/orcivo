export function documentosError(error: unknown, action: 'load' | 'download'): string {
  const failure = error as {
    status?: number;
    message?: string;
  } | null;
  // The shared GET client includes the status in its Error message; downloadAsync exposes status.
  const status = failure?.status ?? Number(failure?.message?.match(/ (\d{3})$/)?.[1]);
  if (status === 401) return 'Sua sessão expirou. Entre novamente.';
  if (status === 403) return 'Você não tem permissão para acessar este documento.';
  if (action === 'load') {
    return 'Não foi possível carregar os documentos. Verifique sua conexão e tente novamente.';
  }
  return 'Não foi possível baixar o PDF. Verifique sua conexão e tente novamente.';
}
