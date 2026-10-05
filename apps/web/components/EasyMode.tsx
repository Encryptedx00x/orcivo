'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Smile } from 'lucide-react';
import { EASY_KEY } from '../lib/easy-mode';

// "Modo fácil" is the /facil experience (app/facil). This file only holds the
// per-device flag (html[data-easy='1'], set before paint by lib/easy-mode) and the
// glue inside the standard app: landing on /dashboard goes to /facil, and full
// screens opened from Modo fácil ("Mais opções") get a way back.
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

/** Rendered by the standard (app) layout. */
export function EasyModeGlue(): JSX.Element | null {
  const [easyOn] = useEasyMode();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (easyOn && pathname === '/dashboard') router.replace('/facil');
  }, [easyOn, pathname, router]);

  if (!easyOn || pathname === '/dashboard') return null;
  return (
    <a
      href="/facil"
      style={{
        position: 'fixed',
        left: '50%',
        transform: 'translateX(-50%)',
        bottom: 'max(16px, env(safe-area-inset-bottom))',
        zIndex: 70,
        height: 52,
        padding: '0 20px',
        borderRadius: 9999,
        background: '#6D28D9',
        color: '#FFFFFF',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        fontSize: 16,
        fontWeight: 700,
        textDecoration: 'none',
        boxShadow: '0 10px 24px rgba(109,40,217,0.35)',
        whiteSpace: 'nowrap',
      }}
    >
      <Smile size={20} aria-hidden="true" /> Voltar ao Modo fácil
    </a>
  );
}
