import { useCallback, useRef, useState } from 'react';

/**
 * Server-paged list for FlatList: refresh() loads page 1, loadMore() appends the
 * next page (wire it to onEndReached). A short page means the end was reached.
 * Responses from a superseded refresh are dropped.
 */
export function usePagedList<T extends { id: string }>(
  fetchPage: (page: number) => Promise<T[]>,
  pageSize = 20,
) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const st = useRef({ page: 1, done: false, busy: false, gen: 0 });

  const refresh = useCallback(async () => {
    const gen = ++st.current.gen;
    st.current = { page: 1, done: false, busy: true, gen };
    setLoading(true);
    setFailed(false);
    try {
      const rows = await fetchPage(1);
      if (gen !== st.current.gen) return;
      setItems(rows);
      st.current.done = rows.length < pageSize;
    } catch {
      if (gen === st.current.gen) setFailed(true);
    } finally {
      if (gen === st.current.gen) {
        st.current.busy = false;
        setLoading(false);
      }
    }
  }, [fetchPage, pageSize]);

  const loadMore = useCallback(async () => {
    const s = st.current;
    if (s.busy || s.done) return;
    s.busy = true;
    setLoadingMore(true);
    const gen = s.gen;
    try {
      const rows = await fetchPage(s.page + 1);
      if (gen !== st.current.gen) return;
      st.current.page += 1;
      st.current.done = rows.length < pageSize;
      setItems((prev) => [...prev, ...rows.filter((r) => !prev.some((p) => p.id === r.id))]);
    } catch {
      // keep what we have; the next scroll retries
    } finally {
      if (gen === st.current.gen) st.current.busy = false;
      setLoadingMore(false);
    }
  }, [fetchPage, pageSize]);

  return { items, loading, failed, loadingMore, refresh, loadMore };
}
