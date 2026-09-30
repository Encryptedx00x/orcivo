export function planoError(error: unknown): string {
  const failure = error as { status?: number; message?: string } | null;
  // The shared GET client includes the status in its Error message (see api.ts).
  const status = failure?.status ?? Number(failure?.message?.match(/^GET \S+ (\d{3})$/)?.[1]);
  if (status === 401) return 'Sua sessão expirou. Entre novamente.';
  return 'Não foi possível carregar o plano. Verifique sua conexão e tente novamente.';
}
