'use client';

import {
  QUOTE_DOC_SWITCHES,
  QUOTE_DOC_TITLES,
  resolveQuoteDocOptions,
  type QuoteDocOptions,
  type QuoteDocTitle,
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
    </div>
  );
}
