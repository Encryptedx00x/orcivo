'use client';
import { createContext, useContext, useState, type ReactNode } from 'react';

interface MobileSidebarState {
  open: boolean;
  toggle: () => void;
  close: () => void;
}

const MobileSidebarContext = createContext<MobileSidebarState>({
  open: false,
  toggle: () => {},
  close: () => {},
});

export function MobileSidebarProvider({ children }: { children: ReactNode }): JSX.Element {
  const [open, setOpen] = useState(false);
  return (
    <MobileSidebarContext.Provider
      value={{ open, toggle: () => setOpen((v) => !v), close: () => setOpen(false) }}
    >
      {children}
    </MobileSidebarContext.Provider>
  );
}

export function useMobileSidebar(): MobileSidebarState {
  return useContext(MobileSidebarContext);
}
