import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api } from '../services/api';

interface SubscriptionState {
  status: string | null;
  is_blocked: boolean;
  is_past_due: boolean;
  message: string | null;
  plan_code: string;
  loading: boolean;
}

const SubscriptionContext = createContext<SubscriptionState & { refresh: () => void }>({
  status: null, is_blocked: false, is_past_due: false, message: null, plan_code: 'LIVRE', loading: true,
  refresh: () => {},
});

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<SubscriptionState>({
    status: null, is_blocked: false, is_past_due: false, message: null, plan_code: 'LIVRE', loading: true,
  });

  const fetchStatus = useCallback(async () => {
    try {
      const data = await api.get<SubscriptionState>('/me/subscription-status');
      setState({ ...data, loading: false });
    } catch {
      setState(s => ({ ...s, loading: false }));
    }
  }, []);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  return (
    <SubscriptionContext.Provider value={{ ...state, refresh: fetchStatus }}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export const useSubscription = () => useContext(SubscriptionContext);
