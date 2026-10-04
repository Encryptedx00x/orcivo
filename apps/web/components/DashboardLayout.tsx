'use client';

import { useEffect, useState } from 'react';
import { LayoutGrid, List, Smile } from 'lucide-react';
import { useEasyMode } from './EasyMode';

type Layout = 'classic' | 'bento';
const STORAGE_KEY = 'orcivo.dashboardLayout';

/**
 * Phones can switch the dashboard between the classic list, a bento grid and the
 * easy-mode home. All trees are server-rendered; CSS (data-layout / html[data-easy])
 * picks one, so there is no hydration mismatch or flash. Desktop stays classic.
 */
export function DashboardLayout({
  bento,
  easy,
  children,
}: {
  bento: React.ReactNode;
  easy: React.ReactNode;
  children: React.ReactNode;
}): JSX.Element {
  const [layout, setLayout] = useState<Layout>('classic');
  const [easyOn, setEasy] = useEasyMode();

  useEffect(() => {
    try {
      if (window.localStorage.getItem(STORAGE_KEY) === 'bento') setLayout('bento');
    } catch {
      // storage blocked (private mode): keep the default
    }
  }, []);

  const choose = (next: Layout) => {
    setEasy(false);
    setLayout(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore
    }
  };

  const options = [
    { key: 'classic', icon: List, label: 'Lista', active: !easyOn && layout === 'classic' },
    { key: 'bento', icon: LayoutGrid, label: 'Blocos', active: !easyOn && layout === 'bento' },
    { key: 'easy', icon: Smile, label: 'Fácil', active: easyOn },
  ] as const;

  return (
    <div className="ov-dash" data-layout={layout}>
      <div className="ov-dash-switch" role="group" aria-label="Visualização do painel">
        {options.map(({ key, icon: Icon, label, active }) => (
          <button
            key={key}
            type="button"
            aria-pressed={active}
            onClick={() => (key === 'easy' ? setEasy(true) : choose(key))}
            className="ov-dash-switch-btn"
          >
            <Icon size={15} aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>
      <div className="ov-dash-classic">{children}</div>
      <div className="ov-dash-bento">{bento}</div>
      <div className="ov-dash-easy">{easy}</div>
    </div>
  );
}
