'use client';

import { useEffect, useState } from 'react';
import { LayoutGrid, List } from 'lucide-react';

type Layout = 'classic' | 'bento';
const STORAGE_KEY = 'orcivo.dashboardLayout';

/**
 * Phones can switch the dashboard between the classic list and a bento grid.
 * Both trees are server-rendered; CSS (data-layout) picks one, so there is no
 * hydration mismatch or flash. Desktop always shows the classic layout.
 */
export function DashboardLayout({
  bento,
  children,
}: {
  bento: React.ReactNode;
  children: React.ReactNode;
}): JSX.Element {
  const [layout, setLayout] = useState<Layout>('classic');

  useEffect(() => {
    try {
      if (window.localStorage.getItem(STORAGE_KEY) === 'bento') setLayout('bento');
    } catch {
      // storage blocked (private mode): keep the default
    }
  }, []);

  const choose = (next: Layout) => {
    setLayout(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore
    }
  };

  return (
    <div className="ov-dash" data-layout={layout}>
      <div className="ov-dash-switch" role="group" aria-label="Visualização do painel">
        {(
          [
            ['classic', List, 'Lista'],
            ['bento', LayoutGrid, 'Blocos'],
          ] as const
        ).map(([value, Icon, label]) => (
          <button
            key={value}
            type="button"
            aria-pressed={layout === value}
            onClick={() => choose(value)}
            className="ov-dash-switch-btn"
          >
            <Icon size={15} aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>
      <div className="ov-dash-classic">{children}</div>
      <div className="ov-dash-bento">{bento}</div>
    </div>
  );
}
