import React, { createContext, useContext, useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';

// Per-device preference, same idea as the web flag (localStorage orcivo.easyMode).
const KEY = 'easy_mode';

interface EasyModeState {
  easy: boolean;
  ready: boolean;
  setEasy: (on: boolean) => void;
}

const Ctx = createContext<EasyModeState>({ easy: false, ready: true, setEasy: () => {} });
export const useEasyMode = () => useContext(Ctx);

export function EasyModeProvider({ children }: { children: React.ReactNode }) {
  const [easy, setEasyState] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    SecureStore.getItemAsync(KEY)
      .then((v) => setEasyState(v === '1'))
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  const setEasy = (on: boolean) => {
    setEasyState(on);
    SecureStore.setItemAsync(KEY, on ? '1' : '0').catch(() => {});
  };

  return <Ctx.Provider value={{ easy, ready, setEasy }}>{children}</Ctx.Provider>;
}
