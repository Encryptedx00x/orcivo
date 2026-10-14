'use client';

import {
  QUOTE_DOC_COLORS,
  QUOTE_DOC_SWITCHES,
  QUOTE_DOC_TITLES,
  RECEIPT_DOC_SWITCHES,
  resolveQuoteDocOptions,
  resolveReceiptDocOptions,
  type QuoteDocColor,
  type QuoteDocOptions,
  type QuoteDocTitle,
  type ReceiptDocOptions,
} from '@orcivo/shared-types';

/** Full mode "O que vai no orçamento": document name + what the client sees. */
export function QuoteDocOptionsForm({
  value,
  onChange,
}: {
  value: QuoteDocOptions | null | undefined;
  onChange: (v: QuoteDocOptions) => void;
}): React.JSX.Element {
  const o = resolveQuoteDocOptions(value);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div>
        <label className="ov-label" htmlFor="doc-title">
          Nome do documento
        </label>
        <select
          id="doc-title"
          className="ov-input"
          style={{ maxWidth: 240 }}
          value={o.title}
          onChange={(e) => onChange({ ...o, title: e.target.value as QuoteDocTitle })}
        >
          {(Object.keys(QUOTE_DOC_TITLES) as QuoteDocTitle[]).map((k) => (
            <option key={k} value={k}>
              {QUOTE_DOC_TITLES[k]}
            </option>
          ))}
        </select>
      </div>
      <div>
        <span className="ov-label">Cor do documento</span>
        <ColorSwatches value={o.color} onPick={(color) => onChange({ ...o, color })} />
      </div>
      <fieldset style={{ border: 'none', margin: 0, padding: 0 }}>
        <legend className="ov-label">O que aparece para o cliente (PDF e link)</legend>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '6px 16px',
          }}
        >
          {QUOTE_DOC_SWITCHES.map((s) => (
            <label
              key={s.key}
              style={{ display: 'flex', alignItems: 'center', gap: 8, minHeight: 36, fontSize: 14 }}
            >
              <input
                type="checkbox"
                checked={o[s.key]}
                onChange={() => onChange({ ...o, [s.key]: !o[s.key] })}
                style={{ width: 18, height: 18, accentColor: '#6D28D9' }}
              />
              {s.label}
            </label>
          ))}
        </div>
      </fieldset>
      <OptionsPreview
        visible={QUOTE_DOC_SWITCHES.filter((item) => o[item.key]).map((item) => item.label)}
        hidden={QUOTE_DOC_SWITCHES.filter((item) => !o[item.key]).map((item) => item.label)}
      />
    </div>
  );
}

/** Company default for receipts; core proof fields remain always visible. */
export function ReceiptDocOptionsForm({
  value,
  onChange,
}: {
  value: ReceiptDocOptions | null | undefined;
  onChange: (v: ReceiptDocOptions) => void;
}): React.JSX.Element {
  const options = resolveReceiptDocOptions(value);
  return (
    <fieldset style={{ border: 'none', margin: 0, padding: 0 }}>
      <legend className="ov-label">O que aparece no recibo</legend>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '6px 16px',
        }}
      >
        {RECEIPT_DOC_SWITCHES.map((item) => (
          <label
            key={item.key}
            style={{ display: 'flex', alignItems: 'center', gap: 8, minHeight: 36, fontSize: 14 }}
          >
            <input
              type="checkbox"
              checked={options[item.key]}
              onChange={() => onChange({ ...options, [item.key]: !options[item.key] })}
              style={{ width: 18, height: 18, accentColor: '#6D28D9' }}
            />
            {item.label}
          </label>
        ))}
      </div>
      <OptionsPreview
        visible={RECEIPT_DOC_SWITCHES.filter((item) => options[item.key]).map((item) => item.label)}
        hidden={RECEIPT_DOC_SWITCHES.filter((item) => !options[item.key]).map((item) => item.label)}
      />
      <p style={{ color: '#64748B', fontSize: 13, margin: '8px 0 0' }}>
        Número, pagador, valor, referência e data permanecem sempre no recibo.
      </p>
    </fieldset>
  );
}

function OptionsPreview({ visible, hidden }: { visible: string[]; hidden: string[] }) {
  return (
    <div
      aria-label="Prévia do conteúdo"
      style={{
        marginTop: 10,
        borderRadius: 12,
        border: '1px solid #E2E8F0',
        background: '#F8FAFC',
        padding: 12,
        fontSize: 13,
        lineHeight: 1.5,
      }}
    >
      <strong style={{ display: 'block', color: '#0A0A0F', marginBottom: 3 }}>
        Prévia do conteúdo
      </strong>
      <span style={{ color: '#334155' }}>
        Vai aparecer: {visible.join(', ') || 'só o essencial'}.
      </span>
      {hidden.length ? (
        <span style={{ display: 'block', color: '#64748B' }}>
          Não vai aparecer: {hidden.join(', ')}.
        </span>
      ) : null}
    </div>
  );
}

/** Accent color of the PDF (header, total). */
export function ColorSwatches({
  value,
  onPick,
}: {
  value: QuoteDocColor;
  onPick: (c: QuoteDocColor) => void;
}): React.JSX.Element {
  return (
    <div
      role="radiogroup"
      aria-label="Cor do documento"
      style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 6 }}
    >
      {(Object.keys(QUOTE_DOC_COLORS) as QuoteDocColor[]).map((k) => (
        <button
          key={k}
          type="button"
          role="radio"
          aria-checked={value === k}
          aria-label={QUOTE_DOC_COLORS[k].label}
          title={QUOTE_DOC_COLORS[k].label}
          onClick={() => onPick(k)}
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: QUOTE_DOC_COLORS[k].hex,
            border: '3px solid #fff',
            boxShadow: value === k ? `0 0 0 2px ${QUOTE_DOC_COLORS[k].hex}` : '0 0 0 1px #E2E8F0',
            cursor: 'pointer',
          }}
        />
      ))}
    </div>
  );
}
