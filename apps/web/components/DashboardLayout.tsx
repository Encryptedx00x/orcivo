'use client';

import { useRouter } from 'next/navigation';
import { LayoutGrid, List } from 'lucide-react';
import { setEasyMode } from './EasyMode';

/** Standard dashboard wrapper with the Padrão/Fácil switch (Fácil opens /facil). */
export function DashboardLayout({ children }: { children: React.ReactNode }): JSX.Element {
  const router = useRouter();
  return (
    <div className="ov-dash">
      <div className="ov-dash-switch" role="group" aria-label="Modo de uso">
        <button type="button" aria-pressed className="ov-dash-switch-btn">
          <List size={15} aria-hidden="true" />
          Padrão
        </button>
        <button
          type="button"
          aria-pressed={false}
          className="ov-dash-switch-btn"
          onClick={() => {
            setEasyMode(true);
            router.push('/facil');
          }}
        >
          <LayoutGrid size={15} aria-hidden="true" />
          Fácil
        </button>
      </div>
      {children}
    </div>
  );
}
