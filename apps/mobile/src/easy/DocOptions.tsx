import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
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
import { C, Options, Toggle, s } from './ui';

/** "O que vai no orçamento": document name + what the client sees (same as the web). */
export function DocOptionsFields({
  value,
  onChange,
}: {
  value: QuoteDocOptions | null | undefined;
  onChange: (v: QuoteDocOptions) => void;
}) {
  const o = resolveQuoteDocOptions(value);
  return (
    <View style={{ gap: 10 }}>
      <Text style={[s.body, { fontWeight: '600' }]}>Nome do documento</Text>
      <Options
        cols={3}
        value={o.title}
        onPick={(title: QuoteDocTitle) => onChange({ ...o, title })}
        options={(Object.keys(QUOTE_DOC_TITLES) as QuoteDocTitle[]).map((k) => ({
          value: k,
          label: QUOTE_DOC_TITLES[k],
        }))}
      />
      <Text style={[s.body, { fontWeight: '600' }]}>Cor do documento</Text>
      <View
        accessibilityRole="radiogroup"
        style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}
      >
        {(Object.keys(QUOTE_DOC_COLORS) as QuoteDocColor[]).map((k) => (
          <TouchableOpacity
            key={k}
            accessibilityRole="radio"
            accessibilityState={{ checked: o.color === k }}
            accessibilityLabel={QUOTE_DOC_COLORS[k].label}
            onPress={() => onChange({ ...o, color: k })}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: QUOTE_DOC_COLORS[k].hex,
              borderWidth: 3,
              borderColor: o.color === k ? '#0A0A0F' : '#FFFFFF',
            }}
          />
        ))}
      </View>
      <Text style={[s.body, { fontWeight: '600' }]}>O que aparece para o cliente</Text>
      {QUOTE_DOC_SWITCHES.map((sw) => (
        <Toggle
          key={sw.key}
          on={o[sw.key]}
          label={sw.label}
          onChange={(v) => onChange({ ...o, [sw.key]: v })}
        />
      ))}
      <Text style={s.muted}>
        Vale para o PDF e para o link de aprovação. O que estiver desligado não vai para o cliente.
      </Text>
      <ContentPreview
        visible={QUOTE_DOC_SWITCHES.filter((item) => o[item.key]).map((item) => item.label)}
        hidden={QUOTE_DOC_SWITCHES.filter((item) => !o[item.key]).map((item) => item.label)}
      />
    </View>
  );
}

export function ReceiptDocOptionsFields({
  value,
  onChange,
}: {
  value: ReceiptDocOptions | null | undefined;
  onChange: (v: ReceiptDocOptions) => void;
}) {
  const options = resolveReceiptDocOptions(value);
  return (
    <View style={{ gap: 8 }}>
      <Text style={[s.body, { fontWeight: '600' }]}>O que aparece no recibo</Text>
      {RECEIPT_DOC_SWITCHES.map((item) => (
        <Toggle
          key={item.key}
          on={options[item.key]}
          label={item.label}
          onChange={(on) => onChange({ ...options, [item.key]: on })}
        />
      ))}
      <ContentPreview
        visible={RECEIPT_DOC_SWITCHES.filter((item) => options[item.key]).map((item) => item.label)}
        hidden={RECEIPT_DOC_SWITCHES.filter((item) => !options[item.key]).map((item) => item.label)}
      />
      <Text style={s.muted}>Número, pagador, valor, referência e data ficam sempre visíveis.</Text>
    </View>
  );
}

function ContentPreview({ visible, hidden }: { visible: string[]; hidden: string[] }) {
  return (
    <View
      accessibilityLabel="Prévia do conteúdo"
      style={{ borderWidth: 1, borderColor: C.line, borderRadius: 12, padding: 12, gap: 3 }}
    >
      <Text style={[s.body, { fontWeight: '700' }]}>Prévia do conteúdo</Text>
      <Text style={s.muted}>Vai aparecer: {visible.join(', ') || 'só o essencial'}.</Text>
      {hidden.length ? <Text style={s.muted}>Oculto: {hidden.join(', ')}.</Text> : null}
    </View>
  );
}
