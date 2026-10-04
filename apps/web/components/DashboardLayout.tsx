'use client';

import { LayoutGrid, List } from 'lucide-react';
import { useEasyMode } from './EasyMode';

/**
 * Phones can switch the dashboard between the standard layout and the easy-mode
 * bento grid. Both trees are server-rendered and CSS (html[data-easy]) picks one,
 * so there is no hydration mismatch or flash. Desktop always stays standard.
 */
export function DashboardLayout({
  easy,
  children,
}: {
  easy: React.ReactNode;
  children: React.ReactNode;
}): JSX.Element {
  const [easyOn, setEasy] = useEasyMode();

  const options = [
    { on: false, icon: List, label: 'Padrão' },
    { on: true, icon: LayoutGrid, label: 'Fácil' },
  ] as const;

  return (
    <div className="ov-dash">
      <div className="ov-dash-switch" role="group" aria-label="Modo de uso">
        {options.map(({ on, icon: Icon, label }) => (
          <button
            key={label}
            type="button"
            aria-pressed={easyOn === on}
            onClick={() => setEasy(on)}
            className="ov-dash-switch-btn"
          >
            <Icon size={15} aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>
      <div className="ov-dash-classic">{children}</div>
      <div className="ov-dash-easy">{easy}</div>
    </div>
  );
}
