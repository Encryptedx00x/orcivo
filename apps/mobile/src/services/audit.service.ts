import { api } from './api';

export type AuditEntityType = 'work_order' | 'quote';
export interface AuditRow {
  id: string;
  created_at: string;
  action: string;
  actor_type: string;
  actor_user_id: string | null;
  actor_name: string | null;
  metadata: unknown;
}
export interface AuditPage {
  data: AuditRow[];
  next_cursor: string | null;
}

export const auditService = {
  fetchHistory(entityType: AuditEntityType, entityId: string, cursor?: string): Promise<AuditPage> {
    const query = new URLSearchParams({ entity_type: entityType, entity_id: entityId, limit: '20' });
    if (cursor) query.set('cursor', cursor);
    return api.get<AuditPage>(`/audit-logs?${query}`);
  },
};

const ACTIONS: Record<string, string> = {
  'work_order.created': 'OS criada',
  'work_order.started': 'OS iniciada',
  'work_order.completed': 'OS finalizada',
  'work_order.cancelled': 'OS cancelada',
  'work_order.reopened': 'OS reaberta',
  'work_order.corrected': 'OS corrigida',
  'quote.sent': 'Orçamento enviado',
  'quote.approved': 'Orçamento aprovado',
  'quote.rejected': 'Orçamento recusado',
  'quote.cancelled': 'Orçamento cancelado',
  'quote.expired': 'Orçamento expirado',
  'quote.reopened': 'Orçamento reaberto',
  'quote.corrected': 'Orçamento corrigido',
  'quote.updated': 'Orçamento atualizado',
  'payment.created': 'Recebimento registrado',
  'payment.settled': 'Recebimento confirmado',
  'payment.deleted': 'Recebimento excluído',
};

function metadataText(metadata: unknown, key: string): string | null {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return null;
  const value = (metadata as Record<string, unknown>)[key];
  return typeof value === 'string' && value.trim() ? value : null;
}

export function auditActorLabel(row: AuditRow): string {
  if (row.actor_type === 'SYSTEM') return 'Sistema';
  if (row.actor_type === 'CUSTOMER' || row.actor_type === 'PUBLIC') return 'Cliente (link público)';
  return (
    row.actor_name ||
    (row.actor_user_id ? `Usuário indisponível (${row.actor_user_id})` : 'Usuário não identificado')
  );
}

export function auditActionLabel(row: AuditRow): string {
  return metadataText(row.metadata, 'humanText') ?? ACTIONS[row.action] ?? row.action;
}

export function auditReason(row: AuditRow): string | null {
  return metadataText(row.metadata, 'reason');
}

export function auditDateLabel(value: string): string {
  return new Date(value).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit', timeZoneName: 'short',
  });
}

export function auditErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : '';
  if (/ 403$/.test(message)) return 'Histórico restrito a administradores da empresa.';
  if (/ 401$/.test(message)) return 'Sua sessão expirou. Entre novamente para ver o histórico.';
  return 'Não foi possível carregar o histórico.';
}
