import { useCallback, useEffect, useRef, useState } from 'react';
import { easy, errorText, type EasyClient } from './data';

export function useCustomerSearch(query: string, pageSize = 10) {
  const [items, setItems] = useState<EasyClient[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const requestRef = useRef(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      const requestId = ++requestRef.current;
      setLoading(true);
      setError('');
      void easy
        .customerOptions(query, 1, pageSize)
        .then((next) => {
          if (requestId !== requestRef.current) return;
          setItems(next);
          setPage(1);
          setHasMore(next.length === pageSize);
        })
        .catch((reason) => {
          if (requestId === requestRef.current) {
            setError(errorText(reason, 'Não foi possível carregar seus clientes.'));
          }
        })
        .finally(() => {
          if (requestId === requestRef.current) setLoading(false);
        });
    }, 250);
    return () => {
      clearTimeout(timer);
      requestRef.current += 1;
    };
  }, [pageSize, query, revision]);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    const requestId = ++requestRef.current;
    const nextPage = page + 1;
    setLoading(true);
    setError('');
    try {
      const next = await easy.customerOptions(query, nextPage, pageSize);
      if (requestId !== requestRef.current) return;
      setItems((current) => {
        const merged = new Map(current.map((item) => [item.id, item]));
        next.forEach((item) => merged.set(item.id, item));
        return [...merged.values()];
      });
      setPage(nextPage);
      setHasMore(next.length === pageSize);
    } catch (reason) {
      if (requestId === requestRef.current) {
        setError(errorText(reason, 'Não foi possível carregar mais clientes.'));
      }
    } finally {
      if (requestId === requestRef.current) setLoading(false);
    }
  }, [hasMore, loading, page, pageSize, query]);

  return {
    items,
    loading,
    error,
    hasMore,
    loadMore,
    refresh: () => setRevision((current) => current + 1),
  };
}
