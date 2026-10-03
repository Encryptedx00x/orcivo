export type InviteFailure = 'NOT_FOUND' | 'EXPIRED' | 'ALREADY_USED' | 'NEEDS_ACCOUNT' | 'ACCOUNT_EXISTS' | 'ERROR';

export interface InviteFailureInfo {
  code: InviteFailure;
  /** Terminal states replace the form; the others are shown inline so the user can retry. */
  terminal: boolean;
  title: string;
  message: string;
}

/**
 * Same 3 invite states as the web page (/convite/[token]): the backend has no pre-validation
 * endpoint, so the state is derived from the POST /invites/accept error (status + message).
 */
export function classifyInviteError(error: unknown): InviteFailureInfo {
  const failure = (error ?? {}) as { status?: number; data?: { message?: unknown } };
  const status = failure.status;
  const message = typeof failure.data?.message === 'string' ? failure.data.message : '';

  if (status === 404) {
    return {
      code: 'NOT_FOUND', terminal: true, title: 'Convite não encontrado',
      message: 'Este convite não existe ou o código está incorreto. Peça um novo convite a quem convidou você.',
    };
  }
  if (status === 400 && message.startsWith('Convite expirado')) {
    return {
      code: 'EXPIRED', terminal: true, title: 'Convite expirado',
      message: 'Este convite expirou. Peça um novo convite a quem convidou você.',
    };
  }
  if (status === 400 && message.startsWith('Convite já foi usado')) {
    return {
      code: 'ALREADY_USED', terminal: true, title: 'Convite já utilizado',
      message: 'Este convite já foi aceito (ou expirou/foi cancelado). Se você já aceitou, é só entrar na sua conta.',
    };
  }
  if (status === 400 && message.startsWith('Nome e senha')) {
    return {
      code: 'NEEDS_ACCOUNT', terminal: false, title: 'Dados obrigatórios',
      message: 'Informe seu nome e uma senha para criar a conta.',
    };
  }
  if (status !== undefined && status >= 500) {
    return {
      code: 'ACCOUNT_EXISTS', terminal: false, title: 'Não foi possível aceitar',
      message: 'Não foi possível criar sua conta. Se você já tem conta com o e-mail do convite, entre nela e aceite o convite pelo link no navegador.',
    };
  }
  return {
    code: 'ERROR', terminal: false, title: 'Erro',
    message: 'Não foi possível aceitar o convite agora. Verifique sua conexão e tente novamente.',
  };
}

const TOKEN_RE = /^[A-Za-z0-9_-]{8,128}$/;

/**
 * Accepts either the bare invite token or the full link from the e-mail
 * (https://app.../convite/<token>) and returns the token, or null if it does not look like one.
 */
export function extractInviteToken(input: string | undefined | null): string | null {
  const text = (input ?? '').trim();
  if (!text) return null;
  const fromLink = text.match(/\/convite\/([^/?#\s]+)/);
  // The token charset has no percent-escapes, so no decoding is needed.
  const candidate = fromLink ? fromLink[1] : text;
  return TOKEN_RE.test(candidate) ? candidate : null;
}
