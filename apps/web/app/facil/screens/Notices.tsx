'use client';

import { useCallback, useEffect, useState } from 'react';
import { Bell, Check, CheckCheck } from 'lucide-react';
import { Btn, C, EmptyBox, ErrorBox, H1, Loading, card, useToast } from '../ui';
import { useNav } from '../EasyApp';

interface Notice {
  id: string;
  human_text: string;
  created_at: string;
  read_at: string | null;
}
interface NoticePage {
  data: Notice[];
  next_cursor: string | null;
  unread_count: number;
}

const when = (iso: string) =>
  new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));

async function fetchNotices(cursor?: string): Promise<NoticePage> {
  const q = new URLSearchParams({ limit: '20' });
  if (cursor) q.set('cursor', cursor);
  const r = await fetch(`/api/notifications?${q}`, { cache: 'no-store' });
  if (!r.ok) throw new Error('notifications');
  return (await r.json()) as NoticePage;
}

/** Unread count for the bell (Início and the desktop header), refreshed every minute. */
export function useUnreadNotices(): number {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const load = () =>
      fetch('/api/notifications?limit=1', { cache: 'no-store' })
        .then((r) => (r.ok ? (r.json() as Promise<NoticePage>) : null))
        .then((p) => p && setCount(p.unread_count))
        .catch(() => undefined);
    void load();
    const poll = window.setInterval(load, 60_000);
    return () => window.clearInterval(poll);
  }, []);
  return count;
}

/** Bell button with the unread badge; opens Avisos. */
export function NoticesBell({ size = 48 }: { size?: number }): React.JSX.Element {
  const { go } = useNav();
  const unread = useUnreadNotices();
  return (
    <button
      type="button"
      onClick={() => go('notices')}
      aria-label={unread ? `Avisos: ${unread} novo${unread === 1 ? '' : 's'}` : 'Avisos'}
      style={{
        position: 'relative',
        width: size,
        height: size,
        borderRadius: 14,
        border: `1px solid ${C.border}`,
        background: '#FFFFFF',
        color: C.ink,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        flexShrink: 0,
      }}
    >
      <Bell size={24} aria-hidden="true" />
      {unread > 0 && (
        <span
          style={{
            position: 'absolute',
            top: -6,
            right: -6,
            minWidth: 22,
            height: 22,
            padding: '0 6px',
            borderRadius: 9999,
            background: C.purple,
            color: '#FFFFFF',
            fontSize: 13,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {unread > 99 ? '99+' : unread}
        </span>
      )}
    </button>
  );
}

/** Avisos: the same activity feed as the bell of the full mode. */
export function NoticesScreen(): React.JSX.Element {
  const toast = useToast();
  const [items, setItems] = useState<Notice[]>([]);
  const [next, setNext] = useState<string | null>(null);
  const [unread, setUnread] = useState(0);
  const [state, setState] = useState<'loading' | 'ok' | 'error'>('loading');

  const load = useCallback(async () => {
    setState('loading');
    try {
      const p = await fetchNotices();
      setItems(p.data);
      setNext(p.next_cursor);
      setUnread(p.unread_count);
      setState('ok');
    } catch {
      setState('error');
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const more = async () => {
    if (!next) return;
    try {
      const p = await fetchNotices(next);
      setItems((c) => [...c, ...p.data]);
      setNext(p.next_cursor);
    } catch {
      toast('Não foi possível carregar mais avisos.');
    }
  };
  const markRead = async (id: string) => {
    const r = await fetch(`/api/notifications/${id}/read`, { method: 'PATCH' }).catch(() => null);
    if (!r?.ok) return toast('Não foi possível marcar como lido.');
    const now = new Date().toISOString();
    setItems((c) => c.map((n) => (n.id === id ? { ...n, read_at: now } : n)));
    setUnread((u) => Math.max(0, u - 1));
  };
  const markAll = async () => {
    const r = await fetch('/api/notifications/read-all', { method: 'PATCH' }).catch(() => null);
    if (!r?.ok) return toast('Não foi possível marcar os avisos como lidos.');
    const now = new Date().toISOString();
    setItems((c) => c.map((n) => (n.read_at ? n : { ...n, read_at: now })));
    setUnread(0);
    toast('Todos os avisos foram marcados como lidos.');
  };

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '0 4px' }}>
        <H1>Avisos</H1>
        <span style={{ fontSize: 17, color: C.fg3 }}>
          {unread ? `${unread} novo${unread === 1 ? '' : 's'}` : 'Tudo em dia'}
        </span>
      </div>
      {state === 'loading' ? (
        <Loading />
      ) : state === 'error' ? (
        <ErrorBox title="Não foi possível carregar os avisos." onRetry={() => void load()} />
      ) : items.length === 0 ? (
        <EmptyBox
          icon={Bell}
          title="Nenhum aviso ainda."
          text="Quando um cliente aprovar ou recusar um orçamento, aparece aqui."
        />
      ) : (
        <>
          {unread > 0 && (
            <Btn tone="outline" icon={CheckCheck} height={52} onClick={() => void markAll()}>
              Marcar todos como lidos
            </Btn>
          )}
          <div style={{ ...card, overflow: 'hidden' }}>
            {items.map((n, i) => (
              <div
                key={n.id}
                style={{
                  display: 'flex',
                  gap: 12,
                  padding: '14px 16px',
                  borderTop: i ? `1px solid ${C.line}` : 'none',
                  background: n.read_at ? '#FFFFFF' : C.purple50,
                }}
              >
                <span
                  aria-label={n.read_at ? 'Lido' : 'Novo'}
                  style={{
                    width: 10,
                    height: 10,
                    marginTop: 8,
                    borderRadius: 9999,
                    flexShrink: 0,
                    background: n.read_at ? C.border : C.purple,
                  }}
                />
                <div
                  style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}
                >
                  <span
                    style={{ fontSize: 17, lineHeight: '24px', fontWeight: n.read_at ? 400 : 600 }}
                  >
                    {n.human_text}
                  </span>
                  <span style={{ fontSize: 15, color: C.fg3 }}>{when(n.created_at)}</span>
                  {!n.read_at && (
                    <button
                      type="button"
                      onClick={() => void markRead(n.id)}
                      style={{
                        alignSelf: 'flex-start',
                        minHeight: 40,
                        border: 'none',
                        background: 'transparent',
                        padding: 0,
                        color: C.purple700,
                        fontSize: 16,
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                      }}
                    >
                      <Check size={18} aria-hidden="true" /> Marcar como lido
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          {next && (
            <Btn tone="link" onClick={() => void more()}>
              Ver mais avisos
            </Btn>
          )}
        </>
      )}
    </>
  );
}
