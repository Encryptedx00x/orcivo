// Versões vigentes dos Termos de Uso e da Política de Privacidade.
// Sem dependências: também é importado diretamente pelo site (apps/site).
// Ao publicar novo texto legal, acrescente a data aqui (lista só cresce) e atualize LEGAL_DOCS_VERSION.

/** Versão atual dos dois documentos (data de vigência, ISO). */
export const LEGAL_DOCS_VERSION = '2026-10-03';

/** Versões que o backend aceita receber do cliente no signup. */
export const SUPPORTED_LEGAL_VERSIONS: readonly string[] = ['2026-10-03'];

/** Valor de contas criadas antes do registro de versão (default da coluna). */
export const LEGACY_LEGAL_VERSION = 'pre-versioning';
