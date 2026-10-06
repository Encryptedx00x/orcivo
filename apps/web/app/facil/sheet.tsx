'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { C } from './ui';
import { useIsDesktop } from './desktop';

export interface SheetAction {
  label: string;
  icon: LucideIcon;
  sub?: string;
  danger?: boolean;
  run: () => void;
}
export interface SheetSpec {
  title: string;
  sub?: string;
  actions: SheetAction[];
}

const Ctx = createContext<(s: SheetSpec) => void>(() => {});
/** Opens the bottom sheet ("Mais ações"). Choosing an action closes it first. */
export const useSheet = () => useContext(Ctx);

/** Reason picker used by actions the backend requires a motive for. */
export function reasonSheet(
  open: (s: SheetSpec) => void,
  title: string,
  reasons: string[],
  onPick: (reason: string) => void,
  icon: LucideIcon,
): void {
  open({
    title,
    sub: 'O motivo fica guardado no histórico.',
    actions: reasons.map((r) => ({ label: r, icon, run: () => onPick(r) })),
  });
}

export function SheetProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [sheet, setSheet] = useState<SheetSpec | null>(null);
  const close = useCallback(() => setSheet(null), []);
  // Desktop: centered dialog instead of a bottom sheet.
  const desktop = useIsDesktop();

  useEffect(() => {
    if (!sheet) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [sheet, close]);

  return (
    <Ctx.Provider value={setSheet}>
      {children}
      {sheet && (
        <>
          <div
            aria-hidden="true"
            onClick={close}
            style={{ position: 'fixed', inset: 0, background: 'rgba(10,10,15,0.5)', zIndex: 80 }}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label={sheet.title}
            style={{
              position: 'fixed',
              zIndex: 81,
              background: '#FFFFFF',
              ...(desktop
                ? {
                    left: '50%',
                    top: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: 480,
                    borderRadius: 24,
                    padding: '20px 16px 16px',
                  }
                : {
                    left: 0,
                    right: 0,
                    bottom: 0,
                    maxWidth: 480,
                    margin: '0 auto',
                    borderRadius: '24px 24px 0 0',
                    padding: '10px 16px max(16px, env(safe-area-inset-bottom))',
                  }),
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
              maxHeight: '80dvh',
              overflowY: 'auto',
              boxShadow: '0 20px 40px rgba(15,23,42,0.18)',
            }}
          >
            {!desktop && (
              <div
                aria-hidden="true"
                style={{
                  width: 44,
                  height: 5,
                  borderRadius: 9999,
                  background: C.borderStrong,
                  alignSelf: 'center',
                  marginBottom: 6,
                }}
              />
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '0 4px 6px' }}>
              <span style={{ fontSize: 21, lineHeight: '27px', fontWeight: 700 }}>
                {sheet.title}
              </span>
              {sheet.sub && <span style={{ fontSize: 16, color: C.fg3 }}>{sheet.sub}</span>}
            </div>
            {sheet.actions.map((a) => {
              const Icon = a.icon;
              return (
                <button
                  key={a.label}
                  type="button"
                  onClick={() => {
                    setSheet(null);
                    a.run();
                  }}
                  style={{
                    minHeight: 64,
                    border: 'none',
                    borderTop: `1px solid ${C.line}`,
                    background: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    padding: '8px 4px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    color: a.danger ? '#B91C1C' : C.ink,
                    fontFamily: 'inherit',
                  }}
                >
                  <span
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      background: a.danger ? '#FEF2F2' : C.purple50,
                      color: a.danger ? '#B91C1C' : C.purple,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Icon size={22} aria-hidden="true" />
                  </span>
                  <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
                    <span style={{ fontSize: 18, lineHeight: '23px', fontWeight: 600 }}>
                      {a.label}
                    </span>
                    {a.sub && <span style={{ fontSize: 15, color: C.fg3 }}>{a.sub}</span>}
                  </span>
                </button>
              );
            })}
            <button
              type="button"
              onClick={close}
              style={{
                height: 56,
                marginTop: 6,
                borderRadius: 16,
                border: `1.5px solid ${C.borderStrong}`,
                background: '#FFFFFF',
                color: C.ink,
                fontSize: 18,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              Fechar
            </button>
          </div>
        </>
      )}
    </Ctx.Provider>
  );
}

/** "Mais ações" link button under cards (design: more-horizontal + label). */
export function MoreButton({
  onClick,
  label = 'Mais ações',
  icon: Icon,
}: {
  onClick: () => void;
  label?: string;
  icon: LucideIcon;
}): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        height: 52,
        border: 'none',
        background: 'transparent',
        color: C.purple700,
        fontSize: 17,
        fontWeight: 600,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        cursor: 'pointer',
        fontFamily: 'inherit',
        width: '100%',
      }}
    >
      <Icon size={22} aria-hidden="true" />
      {label}
    </button>
  );
}
