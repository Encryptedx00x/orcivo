'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { History, X } from 'lucide-react';

type EntityType = 'work_order' | 'quote' | 'payment';
interface AuditRow {
  id: string;
  created_at: string;
  action: string;
  actor_type: string;
  actor_user_id: string | null;
  actor_name: string | null;
  metadata: unknown;
}
interface AuditPage {
  data: AuditRow[];
  next_cursor: string | null;
}

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

function actorLabel(row: AuditRow): string {
  if (row.actor_type === 'SYSTEM') return 'Sistema';
  if (row.actor_type === 'CUSTOMER' || row.actor_type === 'PUBLIC') return 'Cliente (link público)';
  return (
    row.actor_name ||
    (row.actor_user_id ? `Usuário indisponível (${row.actor_user_id})` : 'Usuário não identificado')
  );
}

function HistoryRows({ entityType, entityId }: { entityType: EntityType; entityId: string }) {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [request, setRequest] = useState<{ cursor?: string; attempt: number }>({ attempt: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    const query = new URLSearchParams({
      entity_type: entityType,
      entity_id: entityId,
      limit: '20',
    });
    if (request.cursor) query.set('cursor', request.cursor);
    async function load() {
      try {
        const res = await fetch(`/api/audit-logs?${query}`, {
          cache: 'no-store',
          signal: controller.signal,
        });
        if (!res.ok) {
          throw new Error(
            res.status === 403
              ? 'Histórico restrito a administradores da empresa.'
              : res.status === 401
                ? 'Sua sessão expirou. Entre novamente para ver o histórico.'
                : 'Não foi possível carregar o histórico.',
          );
        }
        const page = (await res.json()) as AuditPage;
        if (controller.signal.aborted) return;
        setRows((previous) => (request.cursor ? [...previous, ...page.data] : page.data));
        setNextCursor(page.next_cursor);
      } catch (err) {
        if (!controller.signal.aborted)
          setError(err instanceof Error ? err.message : 'Histórico indisponível.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [entityType, entityId, request]);

  return (
    <div aria-busy={loading} style={{ fontSize: 13, textAlign: 'left' }}>
      <ol style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {rows.map((row) => {
          const reason = metadataText(row.metadata, 'reason');
          return (
            <li
              key={row.id}
              style={{
                borderBottom: '1px solid #E2E8F0',
                padding: '12px 0',
                overflowWrap: 'anywhere',
              }}
            >
              <div style={{ fontWeight: 600 }}>
                {metadataText(row.metadata, 'humanText') ?? ACTIONS[row.action] ?? row.action}
              </div>
              <div style={{ color: '#64748B', marginTop: 4 }}>
                <time dateTime={row.created_at}>
                  {new Date(row.created_at).toLocaleString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    timeZoneName: 'short',
                  })}
                </time>
                {' · '}
                {actorLabel(row)}
              </div>
              {reason && (
                <p style={{ margin: '8px 0 0', whiteSpace: 'pre-wrap' }}>
                  <strong>Justificativa: </strong>
                  {reason}
                </p>
              )}
            </li>
          );
        })}
      </ol>
      {loading && <p role="status">Carregando histórico…</p>}
      {error && (
        <div role="alert">
          <p>{error}</p>
          <button
            type="button"
            className="ov-btn ov-btn-outline"
            onClick={() =>
              setRequest((previous) => ({ ...previous, attempt: previous.attempt + 1 }))
            }
          >
            Tentar novamente
          </button>
        </div>
      )}
      {!loading && !error && rows.length === 0 && <p>Nenhuma alteração registrada.</p>}
      {!error && nextCursor && (
        <button
          type="button"
          className="ov-btn ov-btn-outline"
          disabled={loading}
          style={{ marginTop: 12 }}
          onClick={() => {
            setLoading(true);
            setRequest({ cursor: nextCursor, attempt: 0 });
          }}
        >
          Carregar mais
        </button>
      )}
    </div>
  );
}

/** Reads existing audit rows on demand; reopening always fetches a fresh page. */
export function EntityHistory({
  entityType,
  entityId,
  label,
  revision = '',
  size = 'sm',
}: {
  entityType: EntityType;
  entityId: string;
  label: string;
  revision?: string | number;
  /** 'md' matches the 36px buttons of page headers; 'sm' fits table rows. */
  size?: 'sm' | 'md';
}): React.JSX.Element {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className="ov-btn ov-btn-outline"
        aria-haspopup="dialog"
        aria-label={`Histórico — ${label}`}
        style={
          size === 'md'
            ? { height: 36, fontSize: 13, gap: 6, padding: '0 14px', whiteSpace: 'nowrap' }
            : { height: 30, fontSize: 12, gap: 6, padding: '0 10px' }
        }
        onClick={() => {
          dialog.current?.showModal();
          setOpen(true);
        }}
      >
        <History size={13} aria-hidden="true" /> Histórico
      </button>
      <dialog
        ref={dialog}
        aria-labelledby={titleId}
        onClose={() => setOpen(false)}
        style={{
          width: 520,
          maxWidth: 'calc(100vw - 32px)',
          maxHeight: '80vh',
          overflowY: 'auto',
          boxSizing: 'border-box',
          padding: 20,
          border: '1px solid #E2E8F0',
          borderRadius: 12,
          color: '#0A0A0F',
          background: '#fff',
          textAlign: 'left',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <h2 id={titleId} style={{ fontSize: 16, margin: 0 }}>
            Histórico — {label}
          </h2>
          <button
            type="button"
            aria-label="Fechar histórico"
            className="ov-btn ov-btn-outline"
            onClick={() => dialog.current?.close()}
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>
        {open && (
          <HistoryRows
            key={`${entityType}:${entityId}:${revision}`}
            entityType={entityType}
            entityId={entityId}
          />
        )}
      </dialog>
    </>
  );
}
