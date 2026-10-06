'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Calendar, FileText, Home, Menu as MenuIcon, Users, type LucideIcon } from 'lucide-react';
import { BackBar, C, ToastProvider } from './ui';
import { HomeScreen } from './screens/Home';
import { QuoteFlow } from './screens/QuoteFlow';
import { ClientsScreen, ClientScreen, ClientNewScreen } from './screens/Clients';
import { QuotesScreen } from './screens/Quotes';
import { ServicesScreen, RunScreen } from './screens/Services';
import { AgendaScreen, AgendaNewScreen } from './screens/Agenda';
import { MoneyScreen } from './screens/Money';
import { MenuScreen } from './screens/Menu';
import { ReceiptsScreen, ReceiptScreen, ReceiptNewScreen } from './screens/Receipts';
import { SettingsScreen, ApprovalsScreen, CatalogScreen, EditScreen } from './screens/Settings';
import { SheetProvider } from './sheet';

export type Screen =
  | 'home'
  | 'q1'
  | 'q2'
  | 'q3'
  | 'sign'
  | 'done'
  | 'clients'
  | 'client'
  | 'clientNew'
  | 'quotes'
  | 'services'
  | 'run'
  | 'agenda'
  | 'agNew'
  | 'money'
  | 'menu'
  | 'receipts'
  | 'receipt'
  | 'receiptNew'
  | 'settings'
  | 'approvals'
  | 'catalog'
  | 'edit';

type Params = Record<string, string | undefined>;
interface Entry {
  screen: Screen;
  params: Params;
}

// ── Quote draft shared by q1 → q2 → q3 → sign → done ─────────────────
export interface DraftItem {
  key: string;
  catalog_item_id?: string;
  name: string;
  price: string; // decimal string
  qty: number;
}
export interface Draft {
  client: { id: string; name: string; phone: string | null } | null;
  items: DraftItem[];
  discountType: 'PERCENT' | 'FIXED';
  discountDigits: string;
  validityDays: number;
  terms: string;
  /** Technician signature for this quote: saved one, one-off image, or none. */
  signature: { mode: 'saved' | 'once' | 'none'; dataUrl?: string };
  result?: { id: string; number: number; total: string };
}
export const emptyDraft = (hasSaved = false): Draft => ({
  client: null,
  items: [],
  discountType: 'PERCENT',
  discountDigits: '',
  validityDays: 15,
  terms: '',
  signature: { mode: hasSaved ? 'saved' : 'none' },
});

interface Nav {
  screen: Screen;
  params: Params;
  go: (screen: Screen, params?: Params) => void;
  /** Swap the current screen (e.g. a finished form for its result). */
  replace: (screen: Screen, params?: Params) => void;
  tab: (screen: Screen) => void;
  back: () => void;
  draft: Draft;
  setDraft: React.Dispatch<React.SetStateAction<Draft>>;
}
const NavCtx = createContext<Nav | null>(null);
export function useNav(): Nav {
  const v = useContext(NavCtx);
  if (!v) throw new Error('useNav outside EasyApp');
  return v;
}

const TABS: Array<{ screen: Screen; label: string; icon: LucideIcon; covers: Screen[] }> = [
  { screen: 'home', label: 'Início', icon: Home, covers: ['home', 'services', 'money'] },
  { screen: 'clients', label: 'Clientes', icon: Users, covers: ['clients', 'client'] },
  { screen: 'quotes', label: 'Orçamentos', icon: FileText, covers: ['quotes'] },
  { screen: 'agenda', label: 'Agenda', icon: Calendar, covers: ['agenda'] },
  {
    screen: 'menu',
    label: 'Menu',
    icon: MenuIcon,
    covers: ['menu', 'receipts', 'settings', 'catalog'],
  },
];
const NAV_SCREENS: Screen[] = [
  'home',
  'clients',
  'client',
  'quotes',
  'services',
  'agenda',
  'money',
  'menu',
  'receipts',
  'settings',
  'catalog',
];
const BACK_SCREENS: Screen[] = [
  'q1',
  'q2',
  'q3',
  'sign',
  'client',
  'clientNew',
  'run',
  'agNew',
  'services',
  'money',
  'receipts',
  'receipt',
  'receiptNew',
  'settings',
  'approvals',
  'catalog',
  'edit',
];
const STEP: Partial<Record<Screen, number>> = { q1: 1, q2: 2, q3: 3 };

export function EasyApp({ initial }: { initial?: Screen }): JSX.Element {
  const [stack, setStack] = useState<Entry[]>([{ screen: initial ?? 'home', params: {} }]);
  const [draft, setDraft] = useState<Draft>(emptyDraft());
  const scrollRef = useRef<HTMLDivElement>(null);
  const cur = stack[stack.length - 1];

  const top = () => scrollRef.current?.scrollTo({ top: 0 });
  const go = useCallback((screen: Screen, params: Params = {}) => {
    setStack((s) => [...s, { screen, params }]);
    window.history.pushState({ easy: true }, '');
    top();
  }, []);
  const replace = useCallback((screen: Screen, params: Params = {}) => {
    setStack((s) => [...s.slice(0, -1), { screen, params }]);
    top();
  }, []);
  const tab = useCallback((screen: Screen) => {
    setStack([{ screen, params: {} }]);
    top();
  }, []);
  const back = useCallback(() => {
    setStack((s) => (s.length > 1 ? s.slice(0, -1) : [{ screen: 'home', params: {} }]));
    top();
  }, []);

  // Phone back button / browser back walks the in-app stack.
  useEffect(() => {
    const onPop = () => back();
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [back]);

  // In-app "back" goes through history so the phone back button stays in sync.
  const historyBack = useCallback(() => {
    if (stack.length > 1) window.history.back();
    else back();
  }, [stack.length, back]);
  const nav: Nav = {
    screen: cur.screen,
    params: cur.params,
    go,
    replace,
    tab,
    back: historyBack,
    draft,
    setDraft,
  };
  const showNav = NAV_SCREENS.includes(cur.screen);

  return (
    <NavCtx.Provider value={nav}>
      <ToastProvider bottom={showNav ? 96 : 24}>
        <SheetProvider>
          <div
            style={{
              minHeight: '100dvh',
              background: C.bg,
              color: C.ink,
              fontSize: 18,
              lineHeight: 1.4,
              display: 'flex',
              flexDirection: 'column',
              maxWidth: 480,
              margin: '0 auto',
              WebkitFontSmoothing: 'antialiased',
            }}
          >
            <div
              ref={scrollRef}
              style={{
                flex: 1,
                padding: '16px 16px 28px',
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
                paddingBottom: showNav ? 112 : 28,
              }}
            >
              {BACK_SCREENS.includes(cur.screen) && (
                <BackBar onBack={historyBack} step={STEP[cur.screen]} />
              )}
              <CurrentScreen screen={cur.screen} />
            </div>
            {showNav && (
              <nav
                aria-label="Navegação principal"
                style={{
                  position: 'fixed',
                  left: 0,
                  right: 0,
                  bottom: 0,
                  height: 84,
                  background: '#FFFFFF',
                  borderTop: `1px solid ${C.border}`,
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1.25fr 1fr 0.9fr',
                  padding: '0 4px env(safe-area-inset-bottom)',
                  zIndex: 40,
                }}
              >
                {TABS.map((t) => {
                  const on = t.covers.includes(cur.screen);
                  const Icon = t.icon;
                  return (
                    <button
                      key={t.screen}
                      type="button"
                      onClick={() => tab(t.screen)}
                      aria-current={on ? 'page' : undefined}
                      style={{
                        border: 'none',
                        background: 'transparent',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 4,
                        cursor: 'pointer',
                        color: on ? C.purple800 : C.fg2,
                        minWidth: 0,
                        padding: 0,
                        fontFamily: 'inherit',
                      }}
                    >
                      <span
                        style={{
                          width: 60,
                          height: 34,
                          borderRadius: 9999,
                          background: on ? C.purple100 : 'transparent',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Icon size={26} aria-hidden="true" />
                      </span>
                      <span
                        style={{
                          fontSize: 14,
                          fontWeight: on ? 700 : 500,
                          letterSpacing: '-0.01em',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {t.label}
                      </span>
                    </button>
                  );
                })}
              </nav>
            )}
          </div>
        </SheetProvider>
      </ToastProvider>
    </NavCtx.Provider>
  );
}

function CurrentScreen({ screen }: { screen: Screen }) {
  switch (screen) {
    case 'home':
      return <HomeScreen />;
    case 'q1':
    case 'q2':
    case 'q3':
    case 'sign':
    case 'done':
      return <QuoteFlow step={screen} />;
    case 'clients':
      return <ClientsScreen />;
    case 'client':
      return <ClientScreen />;
    case 'clientNew':
      return <ClientNewScreen />;
    case 'quotes':
      return <QuotesScreen />;
    case 'services':
      return <ServicesScreen />;
    case 'run':
      return <RunScreen />;
    case 'agenda':
      return <AgendaScreen />;
    case 'agNew':
      return <AgendaNewScreen />;
    case 'money':
      return <MoneyScreen />;
    case 'menu':
      return <MenuScreen />;
    case 'receipts':
      return <ReceiptsScreen />;
    case 'receipt':
      return <ReceiptScreen />;
    case 'receiptNew':
      return <ReceiptNewScreen />;
    case 'settings':
      return <SettingsScreen />;
    case 'approvals':
      return <ApprovalsScreen />;
    case 'catalog':
      return <CatalogScreen />;
    case 'edit':
      return <EditScreen />;
  }
}

/** Fixed bottom action bar (design: "BARRA DE AÇÃO"); renders a spacer so content clears it. */
export function ActionBar({
  children,
  total,
}: {
  children: React.ReactNode;
  total?: string;
}): JSX.Element {
  return (
    <>
      <div style={{ height: total ? 170 : 110 }} aria-hidden="true" />
      <div
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 45,
          background: '#FFFFFF',
          borderTop: `1px solid ${C.border}`,
          padding: '12px 16px max(16px, env(safe-area-inset-bottom))',
        }}
      >
        <div
          style={{
            maxWidth: 448,
            margin: '0 auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          {total && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                padding: '0 4px',
              }}
            >
              <span style={{ fontSize: 17, fontWeight: 600, color: C.fg2 }}>Total</span>
              <span
                style={{
                  fontSize: 28,
                  fontWeight: 800,
                  letterSpacing: '-0.02em',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {total}
              </span>
            </div>
          )}
          {children}
        </div>
      </div>
    </>
  );
}

export function Hint({ children }: { children: React.ReactNode }): JSX.Element {
  return <span style={{ fontSize: 15, color: C.fg3, textAlign: 'center' }}>{children}</span>;
}

/** Shared async loader for screens: { data, error, loading, reload }. */
export function useLoad<T>(
  fn: () => Promise<{ ok: true; data: T } | { ok: false; message: string }>,
  deps: unknown[] = [],
) {
  const [state, setState] = useState<{ data?: T; error?: string; loading: boolean }>({
    loading: true,
  });
  const [nonce, setNonce] = useState(0);
  useEffect(() => {
    let alive = true;
    setState((s) => ({ ...s, loading: true, error: undefined }));
    fn().then((r) => {
      if (!alive) return;
      setState(r.ok ? { data: r.data, loading: false } : { error: r.message, loading: false });
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nonce, ...deps]);
  return {
    ...state,
    reload: () => setNonce((n) => n + 1),
    setData: (d: T) => setState({ data: d, loading: false }),
  };
}
