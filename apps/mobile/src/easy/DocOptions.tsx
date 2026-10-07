import React from 'react';
import { Text, View } from 'react-native';
import {
  QUOTE_DOC_SWITCHES,
  QUOTE_DOC_TITLES,
  resolveQuoteDocOptions,
  type QuoteDocOptions,
  type QuoteDocTitle,
} from '@orcivo/shared-types';
import { Options, Toggle, s } from './ui';

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
    </View>
  );
}
