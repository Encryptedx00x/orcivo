import { useCallback, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

/** Refresh on focus/foreground; discard obsolete screen or tenant responses. */
export function useFocusedResource<T>(load: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const generation = useRef(0);
  const refresh = useCallback(async () => {
    const request = ++generation.current;
    setLoading(true);
    setFailed(false);
    setData(null);
    try {
      const result = await load();
      if (generation.current === request) setData(result);
    } catch {
      if (generation.current === request) setFailed(true);
    } finally {
      if (generation.current === request) setLoading(false);
    }
  }, [load]);
  useFocusEffect(useCallback(() => {
    void refresh();
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') void refresh();
    });
    return () => { generation.current++; subscription.remove(); };
  }, [refresh]));
  return { data, loading, failed, refresh };
}
