'use client';

import { ChevronRight, type LucideIcon } from 'lucide-react';
import { C } from './ui';

/** White rounded group that holds MenuRows. */
export const box: React.CSSProperties = {
  borderRadius: 24,
  background: '#FFFFFF',
  border: `1px solid ${C.border}`,
  overflow: 'hidden',
};

/** Big tappable list row (Menu, Configurações). */
export function MenuRow({
  icon: Icon,
  label,
  sub,
  onClick,
  href,
  danger,
  last,
}: {
  icon: LucideIcon;
  label: string;
  sub?: string;
  onClick?: () => void;
  href?: string;
  danger?: boolean;
  last?: boolean;
}): React.JSX.Element {
  const inner = (
    <>
      <span
        style={{
          width: 48,
          height: 48,
          borderRadius: 14,
          background: danger ? '#FEF2F2' : C.purple50,
          color: danger ? '#B91C1C' : C.purple,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Icon size={24} aria-hidden="true" />
      </span>
      <span style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
        <span style={{ fontSize: 18, fontWeight: 600 }}>{label}</span>
        {sub && <span style={{ fontSize: 15, color: C.fg3 }}>{sub}</span>}
      </span>
      {!danger && <ChevronRight size={24} color={C.fg4} aria-hidden="true" />}
    </>
  );
  const style: React.CSSProperties = {
    width: '100%',
    minHeight: 76,
    border: 'none',
    borderBottom: last ? 'none' : `1px solid ${C.line}`,
    background: '#FFFFFF',
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    padding: '10px 16px',
    textAlign: 'left',
    cursor: 'pointer',
    color: danger ? '#B91C1C' : C.ink,
    textDecoration: 'none',
    fontFamily: 'inherit',
  };
  return href ? (
    <a href={href} style={style}>
      {inner}
    </a>
  ) : (
    <button type="button" onClick={onClick} style={style}>
      {inner}
    </button>
  );
}

/** Multi-line text field with the easy-mode look. */
export function TextArea({
  label,
  value,
  onChange,
  placeholder,
  rows = 4,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}): React.JSX.Element {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <span style={{ fontSize: 17, fontWeight: 600, color: C.ink }}>{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        style={{
          borderRadius: 14,
          border: `1.5px solid ${C.borderStrong}`,
          padding: '14px 16px',
          fontSize: 18,
          color: C.ink,
          background: '#FFFFFF',
          fontFamily: 'inherit',
          resize: 'vertical',
          outline: 'none',
        }}
      />
    </label>
  );
}

/** Native date input with the easy-mode look. */
export function DateField({
  label,
  value,
  onChange,
  max,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  max?: string;
}): React.JSX.Element {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <span style={{ fontSize: 17, fontWeight: 600, color: C.ink }}>{label}</span>
      <input
        type="date"
        value={value}
        max={max}
        onChange={(e) => e.target.value && onChange(e.target.value)}
        style={{
          height: 60,
          borderRadius: 14,
          border: `1.5px solid ${C.borderStrong}`,
          padding: '0 16px',
          fontSize: 18,
          color: C.ink,
          background: '#FFFFFF',
          fontFamily: 'inherit',
        }}
      />
    </label>
  );
}

export const ymd = (d: Date) => d.toLocaleDateString('sv-SE');
export const centsToDecimal = (digits: string) => {
  const n = digits.replace(/\D/g, '').replace(/^0+/, '') || '0';
  const padded = n.padStart(3, '0');
  return `${padded.slice(0, -2)}.${padded.slice(-2)}`;
};
/** "690.00" → "69000" (digits typed into a money field). */
export const decimalToDigits = (v: string) => {
  const [a, b = ''] = v.split('.');
  return `${a}${b.padEnd(2, '0').slice(0, 2)}`.replace(/^0+/, '');
};
