'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { searchClients, type EasyClient } from './actions';

export function useCustomerSearch(query: string, pageSize = 10) {
  const [items, setItems] = useState<EasyClient[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const requestRef = useRef(0);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const requestId = ++requestRef.current;
      setLoading(true);
      setError('');
      void searchClients(query, 1, pageSize).then((result) => {
        if (requestId !== requestRef.current) return;
        if (!result.ok) {
          setError(result.message);
          setLoading(false);
          return;
        }
        setItems(result.data.items);
        setPage(1);
        setHasMore(result.data.hasMore);
        setLoading(false);
      });
    }, 250);
    return () => {
      window.clearTimeout(timer);
      requestRef.current += 1;
    };
  }, [pageSize, query, revision]);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    const requestId = ++requestRef.current;
    const nextPage = page + 1;
    setLoading(true);
    setError('');
    const result = await searchClients(query, nextPage, pageSize);
    if (requestId !== requestRef.current) return;
    if (!result.ok) {
      setError(result.message);
      setLoading(false);
      return;
    }
    setItems((current) => {
      const merged = new Map(current.map((item) => [item.id, item]));
      result.data.items.forEach((item) => merged.set(item.id, item));
      return [...merged.values()];
    });
    setPage(nextPage);
    setHasMore(result.data.hasMore);
    setLoading(false);
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
