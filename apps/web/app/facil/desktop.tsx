'use client';

import { useEffect, useState } from 'react';
import {
  Calendar,
  ClipboardList,
  DollarSign,
  FileText,
  Home,
  Menu as MenuIcon,
  Package,
  ReceiptText,
  Settings,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { BrandMark } from '../../components/BrandMark';
import { C } from './ui';
import { NoticesBell } from './screens/Notices';
import type { Screen } from './EasyApp';

/** Modo fácil uses a sidebar layout from this width on (design "Recibos Desktop"). */
const DESKTOP_QUERY = '(min-width: 1024px)';

export function useIsDesktop(): boolean {
  const [desktop, setDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_QUERY);
    const sync = () => setDesktop(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);
  return desktop;
}

const NAV: Array<{ screen: Screen; label: string; icon: LucideIcon; covers: Screen[] }> = [
  { screen: 'home', label: 'Início', icon: Home, covers: ['home'] },
  { screen: 'clients', label: 'Clientes', icon: Users, covers: ['clients', 'client', 'clientNew'] },
  {
    screen: 'quotes',
    label: 'Orçamentos',
    icon: FileText,
    covers: ['quotes', 'q1', 'q2', 'q3', 'sign', 'done'],
  },
  { screen: 'services', label: 'Serviços', icon: ClipboardList, covers: ['services', 'run'] },
  { screen: 'agenda', label: 'Agenda', icon: Calendar, covers: ['agenda', 'agNew'] },
  { screen: 'money', label: 'Financeiro', icon: DollarSign, covers: ['money'] },
  {
    screen: 'receipts',
    label: 'Recibos',
    icon: ReceiptText,
    covers: ['receipts', 'receipt', 'receiptNew'],
  },
  { screen: 'catalog', label: 'Meus serviços e preços', icon: Package, covers: ['catalog'] },
  {
    screen: 'settings',
    label: 'Configurações',
    icon: Settings,
    covers: ['settings', 'approvals', 'osStatuses', 'edit'],
  },
  { screen: 'menu', label: 'Mais', icon: MenuIcon, covers: ['menu'] },
];

const LABELS: Record<Screen, string> = {
  home: 'Início',
  q1: 'Novo orçamento · Para quem?',
  q2: 'Novo orçamento · O que vai fazer?',
  q3: 'Novo orçamento · Revisar e enviar',
  sign: 'Assinatura',
  done: 'Pronto',
  clients: 'Clientes',
  client: 'Clientes · Cliente',
  clientNew: 'Clientes · Cliente novo',
  quotes: 'Orçamentos',
  services: 'Serviços de hoje',
  run: 'Serviços · Executar',
  agenda: 'Agenda',
  agNew: 'Agenda · Marcar horário',
  money: 'Financeiro',
  menu: 'Mais',
  receipts: 'Recibos',
  receipt: 'Recibos · Recibo',
  receiptNew: 'Recibos · Novo recibo',
  settings: 'Configurações',
  approvals: 'Configurações · Como o cliente aprova',
  osStatuses: 'Configurações · Ordem de serviço',
  catalog: 'Meus serviços e preços',
  edit: 'Configurações · Editar',
  notices: 'Avisos',
};

/** Desktop frame: sidebar + header + wide content (the phone layout stays as is). */
export function DesktopShell({
  screen,
  onTab,
  children,
}: {
  screen: Screen;
  onTab: (s: Screen) => void;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <div
      style={{
        minHeight: '100dvh',
        background: C.bg,
        color: C.ink,
        fontSize: 18,
        lineHeight: 1.4,
        display: 'flex',
        WebkitFontSmoothing: 'antialiased',
      }}
    >
      <aside
        aria-label="Navegação principal"
        style={{
          width: 280,
          flexShrink: 0,
          background: '#FFFFFF',
          borderRight: `1px solid ${C.border}`,
          display: 'flex',
          flexDirection: 'column',
          padding: '20px 12px',
          gap: 4,
          position: 'sticky',
          top: 0,
          height: '100dvh',
          overflowY: 'auto',
        }}
      >
        <div style={{ padding: '0 8px 20px' }}>
          <BrandMark />
        </div>
        {NAV.map((n) => {
          const on = n.covers.includes(screen);
          const Icon = n.icon;
          return (
            <button
              key={n.screen}
              type="button"
              onClick={() => onTab(n.screen)}
              aria-current={on ? 'page' : undefined}
              style={{
                minHeight: 52,
                borderRadius: 12,
                border: 'none',
                background: on ? C.purple100 : 'transparent',
                color: on ? C.purple800 : C.fg2,
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '0 12px',
                fontSize: 17,
                fontWeight: on ? 700 : 500,
                textAlign: 'left',
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              <Icon size={22} aria-hidden="true" />
              {n.label}
            </button>
          );
        })}
      </aside>
      <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <header
          style={{
            height: 64,
            flexShrink: 0,
            background: '#FFFFFF',
            borderBottom: `1px solid ${C.border}`,
            display: 'flex',
            alignItems: 'center',
            padding: '0 32px',
            gap: 16,
            position: 'sticky',
            top: 0,
            zIndex: 30,
          }}
        >
          <span style={{ fontSize: 15, color: C.fg4 }}>{LABELS[screen]}</span>
          <span style={{ flex: 1 }} />
          <NoticesBell size={40} />
          <span
            style={{
              height: 32,
              padding: '0 12px',
              borderRadius: 9999,
              background: C.purple50,
              color: C.purple800,
              fontSize: 14,
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
            }}
          >
            Modo fácil ligado
          </span>
        </header>
        <div
          style={{
            width: '100%',
            maxWidth: 860,
            padding: '28px 32px 40px',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          {children}
        </div>
      </main>
    </div>
  );
}
