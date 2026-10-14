'use client';

import {
  QUOTE_DOC_SWITCHES,
  QUOTE_DOC_TITLES,
  RECEIPT_DOC_SWITCHES,
  resolveQuoteDocOptions,
  resolveReceiptDocOptions,
  type QuoteDocOptions,
  type QuoteDocTitle,
  type ReceiptDocOptions,
} from '@orcivo/shared-types';
import { ColorSwatches } from '../../components/QuoteDocOptionsForm';
import { C, Options, Toggle } from './ui';

/** "O que vai no orçamento": title of the document and what it shows (PDF and client link). */
export function DocOptionsFields({
  value,
  onChange,
}: {
  value: QuoteDocOptions | null | undefined;
  onChange: (v: QuoteDocOptions) => void;
}): React.JSX.Element {
  const o = resolveQuoteDocOptions(value);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <span style={{ fontSize: 17, fontWeight: 600 }}>Nome do documento</span>
      <Options
        cols={3}
        value={o.title}
        onPick={(title: QuoteDocTitle) => onChange({ ...o, title })}
        options={(Object.keys(QUOTE_DOC_TITLES) as QuoteDocTitle[]).map((k) => ({
          value: k,
          label: QUOTE_DOC_TITLES[k],
        }))}
      />
      <span style={{ fontSize: 17, fontWeight: 600, marginTop: 6 }}>Cor do documento</span>
      <ColorSwatches value={o.color} onPick={(color) => onChange({ ...o, color })} />
      <span style={{ fontSize: 17, fontWeight: 600, marginTop: 6 }}>
        O que aparece para o cliente
      </span>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {QUOTE_DOC_SWITCHES.map((s) => (
          <Toggle
            key={s.key}
            on={o[s.key]}
            label={s.label}
            onClick={() => onChange({ ...o, [s.key]: !o[s.key] })}
          />
        ))}
      </div>
      <span style={{ fontSize: 15, color: C.fg3 }}>
        Vale para o PDF e para o link de aprovação. O que estiver desligado não vai para o cliente.
      </span>
      <ContentPreview
        visible={QUOTE_DOC_SWITCHES.filter((item) => o[item.key]).map((item) => item.label)}
        hidden={QUOTE_DOC_SWITCHES.filter((item) => !o[item.key]).map((item) => item.label)}
      />
    </div>
  );
}

export function ReceiptDocOptionsFields({
  value,
  onChange,
}: {
  value: ReceiptDocOptions | null | undefined;
  onChange: (v: ReceiptDocOptions) => void;
}): React.JSX.Element {
  const options = resolveReceiptDocOptions(value);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <span style={{ fontSize: 17, fontWeight: 600 }}>O que aparece no recibo</span>
      {RECEIPT_DOC_SWITCHES.map((item) => (
        <Toggle
          key={item.key}
          on={options[item.key]}
          label={item.label}
          onClick={() => onChange({ ...options, [item.key]: !options[item.key] })}
        />
      ))}
      <ContentPreview
        visible={RECEIPT_DOC_SWITCHES.filter((item) => options[item.key]).map((item) => item.label)}
        hidden={RECEIPT_DOC_SWITCHES.filter((item) => !options[item.key]).map((item) => item.label)}
      />
      <span style={{ fontSize: 15, color: C.fg3 }}>
        Número, pagador, valor, referência e data ficam sempre visíveis.
      </span>
    </div>
  );
}

function ContentPreview({ visible, hidden }: { visible: string[]; hidden: string[] }) {
  return (
    <div
      style={{
        border: `1px solid ${C.line}`,
        borderRadius: 12,
        background: C.bg,
        padding: 12,
        color: C.fg2,
        fontSize: 14,
        lineHeight: 1.5,
      }}
    >
      <strong style={{ display: 'block', color: C.ink }}>Prévia do conteúdo</strong>
      <span>Vai aparecer: {visible.join(', ') || 'só o essencial'}.</span>
      {hidden.length ? (
        <span style={{ display: 'block' }}>Oculto: {hidden.join(', ')}.</span>
      ) : null}
    </div>
  );
}

/** Short summary for "Mais opções" ("sem preço por item · sem Pix"). */
export function docOptionsSummary(value: QuoteDocOptions | null | undefined): string | null {
  const o = resolveQuoteDocOptions(value);
  const off = QUOTE_DOC_SWITCHES.filter((s) => !o[s.key]).map(
    (s) => `sem ${s.label.charAt(0).toLowerCase()}${s.label.slice(1)}`,
  );
  return (
    [o.title !== 'ORCAMENTO' ? QUOTE_DOC_TITLES[o.title] : null, ...off]
      .filter(Boolean)
      .join(' · ') || null
  );
}
