import React from 'react';
import { Text, View } from 'react-native';
import { describePaymentTerms, type QuotePaymentTerms } from '@orcivo/shared-types';
import { Options, s } from './ui';

type Kind = 'NONE' | QuotePaymentTerms['kind'];

/** Payment terms of a quote (easy and full mode). Approval turns them into receivables. */
export function PaymentTermsFields({
  value,
  onChange,
}: {
  value: QuotePaymentTerms | null | undefined;
  onChange: (v: QuotePaymentTerms | null) => void;
}) {
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
  const installments = (v: QuotePaymentTerms) => (
    <Options
      cols={4}
      value={v.installments ?? 3}
      onPick={(n: number) => onChange({ ...v, installments: n })}
      options={[2, 3, 4, 6, 10, 12].map((n) => ({ value: n, label: `${n}x` }))}
    />
  );
  const sentence = describePaymentTerms(value);
  return (
    <View style={{ gap: 10 }}>
      <Options
        cols={2}
        value={kind}
        onPick={pick}
        options={[
          { value: 'NONE', label: 'Não informar' },
          { value: 'A_VISTA', label: 'À vista' },
          { value: 'ENTRADA', label: 'Entrada + resto' },
          { value: 'PARCELADO', label: 'Parcelado' },
        ]}
      />
      {value?.kind === 'ENTRADA' ? (
        <>
          <Text style={s.muted}>Entrada</Text>
          <Options
            cols={4}
            value={value.upfront_percent ?? 50}
            onPick={(p: number) => onChange({ ...value, upfront_percent: p })}
            options={[20, 30, 40, 50].map((p) => ({ value: p, label: `${p}%` }))}
          />
          <Text style={s.muted}>Restante</Text>
          <Options
            cols={2}
            value={value.rest ?? 'CONCLUSAO'}
            onPick={(rest: 'CONCLUSAO' | 'PARCELAS') =>
              onChange({
                ...value,
                rest,
                installments: rest === 'PARCELAS' ? (value.installments ?? 3) : undefined,
              })
            }
            options={[
              { value: 'CONCLUSAO', label: 'Na conclusão' },
              { value: 'PARCELAS', label: 'Em parcelas' },
            ]}
          />
          {value.rest === 'PARCELAS' ? installments(value) : null}
        </>
      ) : null}
      {value?.kind === 'PARCELADO' ? installments(value) : null}
      {sentence ? (
        <Text style={s.muted}>
          No documento: “{sentence}” Ao aprovar, as cobranças são criadas no Financeiro.
        </Text>
      ) : null}
    </View>
  );
}
