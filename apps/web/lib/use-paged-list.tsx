'use client';

import { useState } from 'react';

/**
 * Server-paged list for the full screens: starts with page 1 (rendered on the
 * server) and appends the next page on "Ver mais". `loadPage` returns null on
 * failure. A short page means there is nothing more to load.
 */
export function usePagedList<T extends { id: string }>(
  initial: T[],
  loadPage: (page: number) => Promise<T[] | null>,
  pageSize = 20,
) {
  const [items, setItems] = useState(initial);
  const [page, setPage] = useState(1);
  const [done, setDone] = useState(initial.length < pageSize);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const more = async () => {
    if (busy || done) return;
    setBusy(true);
    setFailed(false);
    const next = await loadPage(page + 1);
    setBusy(false);
    if (!next) return setFailed(true);
    setItems((prev) => [...prev, ...next.filter((n) => !prev.some((p) => p.id === n.id))]);
    setPage(page + 1);
    if (next.length < pageSize) setDone(true);
  };

  /** Updates one loaded row in place (e.g. after a status change). */
  const replace = (item: T) => setItems((prev) => prev.map((p) => (p.id === item.id ? item : p)));
  return { items, more, done, busy, failed, replace };
}

export function LoadMore({
  list,
  label = 'Ver mais',
}: {
  list: { more: () => Promise<void>; done: boolean; busy: boolean; failed: boolean };
  label?: string;
}): React.JSX.Element | null {
  if (list.done) return null;
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
        padding: '16px 0',
      }}
    >
      {list.failed && (
        <span role="alert" style={{ fontSize: 13, color: '#B91C1C' }}>
          Não foi possível carregar mais. Tente de novo.
        </span>
      )}
      <button
        type="button"
        className="ov-btn ov-btn-secondary"
        onClick={() => void list.more()}
        disabled={list.busy}
        aria-busy={list.busy || undefined}
      >
        {list.busy ? 'Carregando…' : label}
      </button>
    </div>
  );
}
