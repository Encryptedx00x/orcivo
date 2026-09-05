import { z } from 'zod';

// ADR-015 — trilha de auditoria de negócio. Quem executou a ação: um membro
// autenticado da empresa (USER), um processo interno (SYSTEM, ex.: expiração
// de orçamento) ou um terceiro sem sessão agindo via link público (CUSTOMER,
// ex.: aprovação de orçamento por token).
export const AuditActorTypeEnum = z.enum(['USER', 'SYSTEM', 'CUSTOMER']);
export type AuditActorType = z.infer<typeof AuditActorTypeEnum>;

/**
 * Contrato de entrada do `AuditService.record()`. `action`/`entityType` são
 * strings livres em formato `dominio.evento` / `dominio` (ex.: `quote.approved`,
 * `quote`) — de propósito, para não engessar cada domínio em um enum central
 * (AC8: sem auditoria enterprise exaustiva por campo).
 */
export interface AuditRecordInput {
  companyId: string;
  actorType: AuditActorType;
  /** Null/undefined quando actorType é SYSTEM ou CUSTOMER. */
  actorUserId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  /** Estado anterior relevante (ex.: status antigo). Serializado em metadata.from. */
  from?: unknown;
  /** Novo estado relevante. Serializado em metadata.to. */
  to?: unknown;
  reason?: string | null;
  /** Descrição humana, nomeando entidade/contexto/cliente (AC7). */
  humanText: string;
}

/** Formato padronizado da coluna `metadata` (Json) em `audit_logs`. */
export interface AuditLogMetadata {
  from?: unknown;
  to?: unknown;
  reason?: string;
  humanText: string;
}
