'use client';

// Modo fácil primitives — sizes/colors follow docs/design-handoff/modo-facil (v2).
import { ChevronLeft, RotateCcw, WifiOff, type LucideIcon } from 'lucide-react';
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';

export const C = {
  purple: '#6D28D9',
  purple700: '#5B21B6',
  purple800: '#4C1D95',
  purple50: '#F5F3FF',
  purple100: '#EDE9FE',
  purple200: '#DDD6FE',
  purple300: '#C4B5FD',
  ink: '#0A0A0F',
  fg2: '#334155',
  fg3: '#475569',
  fg4: '#64748B',
  border: '#E2E8F0',
  borderStrong: '#CBD5E1',
  line: '#F1F5F9',
  bg: '#F8FAFC',
  green: '#16A34A',
  red: '#DC2626',
};

export const CHIP = {
  wait: { bg: '#FEF3C7', fg: '#92400E', dot: '#D97706' },
  ok: { bg: '#DCFCE7', fg: '#166534', dot: '#16A34A' },
  draft: { bg: '#F1F5F9', fg: '#334155', dot: '#64748B' },
  late: { bg: '#FEE2E2', fg: '#991B1B', dot: '#DC2626' },
  doing: { bg: '#EDE9FE', fg: '#4C1D95', dot: '#6D28D9' },
} as const;
export type ChipKind = keyof typeof CHIP;

export function Chip({
  kind,
  label,
  small,
}: {
  kind: ChipKind;
  label: string;
  small?: boolean;
}): JSX.Element {
  const c = CHIP[kind];
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: small ? 7 : 8,
        height: small ? 30 : 32,
        padding: small ? '0 10px' : '0 12px',
        borderRadius: 9999,
        background: c.bg,
        color: c.fg,
        fontSize: small ? 14 : 15,
        fontWeight: 600,
        whiteSpace: 'nowrap',
        alignSelf: 'flex-start',
      }}
    >
      <span style={{ width: 8, height: 8, borderRadius: 9999, background: c.dot }} />
      {label}
    </span>
  );
}

export const card: React.CSSProperties = {
  borderRadius: 20,
  background: '#FFFFFF',
  border: `1px solid ${C.border}`,
};

export function H1({
  children,
  size = 30,
}: {
  children: React.ReactNode;
  size?: number;
}): JSX.Element {
  return (
    <h1
      style={{
        margin: 0,
        fontSize: size,
        lineHeight: `${size + 6}px`,
        fontWeight: 700,
        letterSpacing: '-0.02em',
        color: C.ink,
      }}
    >
      {children}
    </h1>
  );
}

export function SectionLabel({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <span style={{ fontSize: 17, fontWeight: 700, color: C.fg2, margin: '2px 4px 0' }}>
      {children}
    </span>
  );
}

type BtnTone = 'primary' | 'outline' | 'soft' | 'link' | 'dashed';
export function Btn({
  tone = 'primary',
  icon: Icon,
  iconColor,
  children,
  onClick,
  disabled,
  height = 60,
  type = 'button',
  style,
}: {
  tone?: BtnTone;
  icon?: LucideIcon;
  iconColor?: string;
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  height?: number;
  type?: 'button' | 'submit';
  style?: React.CSSProperties;
}): JSX.Element {
  const tones: Record<BtnTone, React.CSSProperties> = {
    primary: {
      background: disabled ? C.border : C.purple,
      color: disabled ? C.fg4 : '#FFFFFF',
      border: 'none',
      fontSize: 19,
      fontWeight: 700,
    },
    outline: {
      background: '#FFFFFF',
      color: C.ink,
      border: `1.5px solid ${C.borderStrong}`,
      fontSize: 18,
      fontWeight: 600,
    },
    soft: {
      background: C.purple50,
      color: C.purple800,
      border: `1.5px solid ${C.purple200}`,
      fontSize: 18,
      fontWeight: 700,
    },
    link: {
      background: 'transparent',
      color: C.purple700,
      border: 'none',
      fontSize: 17,
      fontWeight: 600,
    },
    dashed: {
      background: C.purple50,
      color: C.purple800,
      border: `2px dashed ${C.purple300}`,
      fontSize: 18,
      fontWeight: 700,
      borderRadius: 20,
    },
  };
  return (
    <button
      type={type}
      onClick={disabled ? undefined : onClick}
      aria-disabled={disabled || undefined}
      style={{
        minHeight: tone === 'link' ? 56 : height,
        width: tone === 'link' ? undefined : '100%',
        borderRadius: 16,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontFamily: 'inherit',
        padding: '0 16px',
        ...tones[tone],
        ...style,
      }}
    >
      {Icon && <Icon size={tone === 'primary' ? 24 : 22} color={iconColor} aria-hidden="true" />}
      {children}
    </button>
  );
}

export function Options<T extends string | number>({
  options,
  value,
  onPick,
  cols = 3,
  height = 56,
}: {
  options: Array<{ value: T; label: string }>;
  value: T | null;
  onPick: (v: T) => void;
  cols?: number;
  height?: number;
}): JSX.Element {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 8 }}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={String(o.value)}
            type="button"
            aria-pressed={on}
            onClick={() => onPick(o.value)}
            style={{
              height,
              borderRadius: 14,
              border: `1.5px solid ${on ? C.purple : C.borderStrong}`,
              background: on ? C.purple : '#FFFFFF',
              color: on ? '#FFFFFF' : C.ink,
              fontSize: 17,
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function Toggle({
  on,
  onClick,
  label,
  sub,
}: {
  on: boolean;
  onClick: () => void;
  label: string;
  sub?: string;
}): JSX.Element {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onClick}
      style={{
        minHeight: 56,
        border: 'none',
        background: 'transparent',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: 0,
        textAlign: 'left',
        cursor: 'pointer',
        color: C.ink,
        width: '100%',
        fontFamily: 'inherit',
      }}
    >
      <span style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
        <span style={{ fontSize: 17 }}>{label}</span>
        {sub && <span style={{ fontSize: 15, color: C.fg3 }}>{sub}</span>}
      </span>
      <span
        style={{
          width: 60,
          height: 36,
          borderRadius: 9999,
          background: on ? C.purple : C.borderStrong,
          padding: 4,
          display: 'flex',
          justifyContent: on ? 'flex-end' : 'flex-start',
          flexShrink: 0,
        }}
      >
        <span
          style={{
            width: 28,
            height: 28,
            borderRadius: 9999,
            background: '#FFFFFF',
            boxShadow: '0 1px 3px rgba(15,23,42,0.2)',
          }}
        />
      </span>
    </button>
  );
}

export function Field({
  label,
  value,
  onChange,
  placeholder,
  inputMode,
  big,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  inputMode?: 'text' | 'numeric' | 'tel';
  big?: boolean;
}): JSX.Element {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <span style={{ fontSize: 17, fontWeight: 600, color: C.ink }}>{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
        type={inputMode === 'tel' ? 'tel' : 'text'}
        style={{
          height: 60,
          borderRadius: 14,
          border: `1.5px solid ${C.borderStrong}`,
          padding: '0 16px',
          fontSize: big ? 20 : 18,
          fontWeight: big ? 700 : 400,
          color: C.ink,
          background: '#FFFFFF',
          fontFamily: 'inherit',
          fontVariantNumeric: 'tabular-nums',
          outline: 'none',
        }}
      />
    </label>
  );
}

export function Search({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}): JSX.Element {
  return (
    <div
      style={{
        height: 64,
        borderRadius: 18,
        border: `1.5px solid ${C.borderStrong}`,
        background: '#FFFFFF',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '0 16px',
      }}
    >
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke={C.fg4}
        strokeWidth="2"
        strokeLinecap="round"
        aria-hidden="true"
      >
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.3-4.3" />
      </svg>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        style={{
          flex: 1,
          minWidth: 0,
          border: 'none',
          background: 'transparent',
          fontSize: 18,
          color: C.ink,
          fontFamily: 'inherit',
          outline: 'none',
        }}
      />
    </div>
  );
}

export function Avatar({ name, size = 48 }: { name: string; size?: number }): JSX.Element {
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: 9999,
        background: C.purple100,
        color: C.purple800,
        fontSize: Math.round(size * 0.36),
        fontWeight: 700,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      {initialsOf(name)}
    </span>
  );
}

export function Loading(): JSX.Element {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }} aria-busy="true">
      <span style={{ fontSize: 17, fontWeight: 600, color: C.fg3, margin: '0 4px' }}>
        Carregando…
      </span>
      {[120, 92, 92, 92].map((h, i) => (
        <div
          key={i}
          className="ov-easy-pulse"
          style={{
            height: h,
            borderRadius: 20,
            background: C.border,
            animationDelay: `${i * 0.12}s`,
          }}
        />
      ))}
    </div>
  );
}

export function ErrorBox({
  title,
  text,
  onRetry,
}: {
  title: string;
  text?: string;
  onRetry: () => void;
}): JSX.Element {
  return (
    <div
      style={{
        ...card,
        borderRadius: 24,
        borderColor: '#FECACA',
        padding: '24px 20px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 12,
        textAlign: 'center',
      }}
    >
      <span
        style={{
          width: 72,
          height: 72,
          borderRadius: 24,
          background: '#FEF2F2',
          color: C.red,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <WifiOff size={34} aria-hidden="true" />
      </span>
      <span style={{ fontSize: 21, lineHeight: '27px', fontWeight: 700 }}>{title}</span>
      <span style={{ fontSize: 17, lineHeight: '24px', color: C.fg2 }}>
        {text ?? 'Confira a internet e toque em Tentar de novo.'}
      </span>
      <Btn icon={RotateCcw} onClick={onRetry} style={{ marginTop: 6 }}>
        Tentar de novo
      </Btn>
    </div>
  );
}

export function EmptyBox({
  icon: Icon,
  title,
  text,
  action,
  onAction,
}: {
  icon: LucideIcon;
  title: string;
  text: string;
  action?: string;
  onAction?: () => void;
}): JSX.Element {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 12,
        textAlign: 'center',
        padding: '36px 12px 0',
      }}
    >
      <span
        style={{
          width: 80,
          height: 80,
          borderRadius: 26,
          background: C.purple50,
          color: C.purple,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon size={38} aria-hidden="true" />
      </span>
      <span style={{ fontSize: 22, lineHeight: '28px', fontWeight: 700 }}>{title}</span>
      <span style={{ fontSize: 17, lineHeight: '24px', color: C.fg2 }}>{text}</span>
      {action && onAction && (
        <Btn onClick={onAction} style={{ marginTop: 8 }}>
          {action}
        </Btn>
      )}
    </div>
  );
}

export function BackBar({ onBack, step }: { onBack: () => void; step?: number }): JSX.Element {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}
      >
        <button
          type="button"
          onClick={onBack}
          style={{
            height: 56,
            padding: '0 22px 0 14px',
            borderRadius: 9999,
            border: `1px solid ${C.border}`,
            background: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 18,
            fontWeight: 600,
            color: C.ink,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          <ChevronLeft size={24} aria-hidden="true" />
          Voltar
        </button>
        {step && (
          <span style={{ fontSize: 16, fontWeight: 600, color: C.fg3 }}>Passo {step} de 3</span>
        )}
      </div>
      {step && (
        <div
          style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6 }}
          aria-hidden="true"
        >
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              style={{ height: 6, borderRadius: 9999, background: n <= step ? C.purple : C.border }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Toast with undo ───────────────────────────────────────────────────
type ToastState = { msg: string; undo?: () => void } | null;
const ToastCtx = createContext<(msg: string, undo?: () => void) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({
  children,
  bottom,
}: {
  children: ReactNode;
  bottom: number;
}): JSX.Element {
  const [toast, setToast] = useState<ToastState>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const show = useCallback((msg: string, undo?: () => void) => {
    clearTimeout(timer.current);
    setToast({ msg, undo });
    timer.current = setTimeout(() => setToast(null), 6000);
  }, []);
  return (
    <ToastCtx.Provider value={show}>
      {children}
      {toast && (
        <div
          role="status"
          style={{
            position: 'fixed',
            left: 12,
            right: 12,
            bottom,
            maxWidth: 456,
            margin: '0 auto',
            zIndex: 60,
            background: C.ink,
            color: '#FFFFFF',
            borderRadius: 18,
            padding: '6px 6px 6px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            boxShadow: '0 20px 40px rgba(15,23,42,0.18)',
            minHeight: 64,
          }}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#4ADE80"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="m9 12 2 2 4-4" />
          </svg>
          <span
            style={{ fontSize: 17, lineHeight: '22px', fontWeight: 600, flex: 1, padding: '8px 0' }}
          >
            {toast.msg}
          </span>
          {toast.undo && (
            <button
              type="button"
              onClick={() => {
                clearTimeout(timer.current);
                toast.undo?.();
                setToast(null);
              }}
              style={{
                height: 56,
                padding: '0 14px',
                border: 'none',
                borderRadius: 14,
                background: 'transparent',
                color: C.purple300,
                fontSize: 17,
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              Desfazer
            </button>
          )}
        </div>
      )}
    </ToastCtx.Provider>
  );
}

// ── formatting helpers ────────────────────────────────────────────────
export function initialsOf(name: string): string {
  const parts = name
    .split(' ')
    .filter((w) => w.length > 2)
    .slice(0, 2);
  return (parts.map((w) => w[0]).join('') || name.slice(0, 1)).toUpperCase();
}
export const firstName = (name: string) => name.split(' ')[0];
export const hhmm = (d: Date) =>
  d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
export function longDate(d = new Date()): string {
  const s = d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  return s.charAt(0).toUpperCase() + s.slice(1);
}
