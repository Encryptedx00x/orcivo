'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Calendar, FileText, Home, Menu, Users } from 'lucide-react';
import { useMobileSidebar } from './MobileSidebar';
import { EASY_KEY } from '../lib/easy-mode';

// "Modo fácil": bigger type and targets, higher contrast and a labeled bottom bar
// on phones. Everything hangs off html[data-easy='1'] (see globals.css), so the
// mode can be removed by deleting this file, lib/easy-mode.ts, its CSS block and
// the pre-paint script in app/layout.tsx.
const EVENT = 'orcivo:easy-mode';

export function setEasyMode(on: boolean): void {
  if (on) document.documentElement.dataset.easy = '1';
  else delete document.documentElement.dataset.easy;
  try {
    window.localStorage.setItem(EASY_KEY, on ? '1' : '0');
  } catch {
    // storage blocked: the mode still applies for this page view
  }
  window.dispatchEvent(new Event(EVENT));
}

export function useEasyMode(): [boolean, (on: boolean) => void] {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const sync = () => setOn(document.documentElement.dataset.easy === '1');
    sync();
    window.addEventListener(EVENT, sync);
    return () => window.removeEventListener(EVENT, sync);
  }, []);
  return [on, setEasyMode];
}

const TABS = [
  { href: '/dashboard', label: 'Início', icon: Home },
  { href: '/clientes', label: 'Clientes', icon: Users },
  { href: '/orcamentos', label: 'Orçamentos', icon: FileText },
  { href: '/agenda', label: 'Agenda', icon: Calendar },
];

export function EasyBottomNav(): JSX.Element {
  const pathname = usePathname();
  const { toggle } = useMobileSidebar();
  return (
    <nav className="ov-easy-nav" aria-label="Navegação principal">
      {TABS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            className="ov-easy-nav-item"
            aria-current={active ? 'page' : undefined}
          >
            <Icon size={24} aria-hidden="true" />
            {label}
          </Link>
        );
      })}
      <button type="button" className="ov-easy-nav-item" onClick={toggle}>
        <Menu size={24} aria-hidden="true" />
        Menu
      </button>
    </nav>
  );
}
