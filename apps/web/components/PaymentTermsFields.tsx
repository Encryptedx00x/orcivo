'use client';

import { describePaymentTerms, type QuotePaymentTerms } from '@orcivo/shared-types';

type Kind = 'NONE' | QuotePaymentTerms['kind'];

const KINDS: Array<{ value: Kind; label: string }> = [
  { value: 'NONE', label: 'Não informar' },
  { value: 'A_VISTA', label: 'À vista' },
  { value: 'ENTRADA', label: 'Entrada + restante' },
  { value: 'PARCELADO', label: 'Parcelado' },
];

function Chip({
  on,
  children,
  onClick,
}: {
  on: boolean;
  children: React.ReactNode;
  onClick: () => void;
}): React.JSX.Element {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      style={{
        padding: '8px 14px',
        borderRadius: 10,
        fontSize: 14,
        fontWeight: 600,
        cursor: 'pointer',
        border: `1.5px solid ${on ? '#6D28D9' : '#E2E8F0'}`,
        background: on ? '#F5F3FF' : '#fff',
        color: on ? '#5B21B6' : '#334155',
      }}
    >
      {children}
    </button>
  );
}

const row: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 8,
  alignItems: 'center',
};

/**
 * Payment terms of a quote (same component in full and easy mode). When the client approves,
 * the backend turns them into receivables.
 */
export function PaymentTermsFields({
  value,
  onChange,
}: {
  value: QuotePaymentTerms | null | undefined;
  onChange: (v: QuotePaymentTerms | null) => void;
}): React.JSX.Element {
  const kind: Kind = value?.kind ?? 'NONE';
  const pick = (k: Kind) =>
    onChange(
      k === 'NONE'
        ? null
        : k === 'A_VISTA'
          ? { kind: 'A_VISTA' }
          : k === 'PARCELADO'
            ? { kind: 'PARCELADO', installments: value?.installments ?? 3 }
            : { kind: 'ENTRADA', upfront_percent: value?.upfront_percent ?? 50, rest: 'CONCLUSAO' },
    );
  const sentence = describePaymentTerms(value);
  const installments = (
    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
      Parcelas
      <select
        className="ov-input"
        style={{ width: 90 }}
        value={value?.installments ?? 3}
        onChange={(e) => value && onChange({ ...value, installments: Number(e.target.value) })}
      >
        {Array.from({ length: 11 }, (_, i) => i + 2).map((n) => (
          <option key={n} value={n}>
            {n}x
          </option>
        ))}
      </select>
    </label>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div role="radiogroup" aria-label="Condição de pagamento" style={row}>
        {KINDS.map((k) => (
          <Chip key={k.value} on={kind === k.value} onClick={() => pick(k.value)}>
            {k.label}
          </Chip>
        ))}
      </div>
      {value?.kind === 'ENTRADA' && (
        <>
          <div style={row}>
            <span style={{ fontSize: 14, color: '#475569' }}>Entrada</span>
            {[30, 50].map((p) => (
              <Chip
                key={p}
                on={value.upfront_percent === p}
                onClick={() => onChange({ ...value, upfront_percent: p })}
              >
                {p}%
              </Chip>
            ))}
            <input
              className="ov-input"
              aria-label="Outra porcentagem de entrada"
              inputMode="numeric"
              style={{ width: 90 }}
              value={value.upfront_percent ?? ''}
              onChange={(e) => {
                const n = Number(e.target.value.replace(/\D/g, '').slice(0, 2));
                onChange({ ...value, upfront_percent: n || undefined });
              }}
            />
            <span style={{ fontSize: 14 }}>%</span>
          </div>
          <div style={row}>
            <span style={{ fontSize: 14, color: '#475569' }}>Restante</span>
            <Chip
              on={value.rest === 'CONCLUSAO'}
              onClick={() => onChange({ ...value, rest: 'CONCLUSAO', installments: undefined })}
            >
              Na conclusão
            </Chip>
            <Chip
              on={value.rest === 'PARCELAS'}
              onClick={() =>
                onChange({ ...value, rest: 'PARCELAS', installments: value.installments ?? 3 })
              }
            >
              Em parcelas
            </Chip>
            {value.rest === 'PARCELAS' && installments}
          </div>
        </>
      )}
      {value?.kind === 'PARCELADO' && <div style={row}>{installments}</div>}
      {sentence && (
        <span style={{ fontSize: 13, color: '#64748B' }}>
          No documento: “{sentence}” Ao aprovar, as cobranças são criadas no Financeiro.
        </span>
      )}
    </div>
  );
}
