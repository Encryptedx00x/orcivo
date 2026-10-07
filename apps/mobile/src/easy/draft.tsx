import React, { createContext, useContext, useMemo, useState } from 'react';
import { Linking } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { multiplyDecimal, sumDecimal } from '@orcivo/shared-types';
import type { EasyClient, EasyQuoteFull } from './data';
import type { EasyStackParamList } from './EasyNavigator';
import { WEB_URL } from '../config';

export type EasyNav = NativeStackNavigationProp<EasyStackParamList>;
export const useEasyNav = () => useNavigation<EasyNav>();

export interface DraftItem {
  key: string;
  catalog_item_id?: string;
  name: string;
  price: string;
  qty: number;
}
/** saved = the technician's saved signature; once = only this quote (file uri); none. */
export interface SignatureChoice {
  mode: 'saved' | 'once' | 'none';
  uri?: string;
}
export interface Draft {
  client: EasyClient | null;
  items: DraftItem[];
  discountType: 'PERCENT' | 'FIXED';
  discountDigits: string;
  validityDays: number;
  terms: string;
  signature: SignatureChoice;
  /** null until the saved signature was checked on the review step. */
  savedSignature: string | null | undefined;
  /** What the client sees of the prices (company default until changed). */
  priceDisplay: 'ITEMS' | 'TOTAL' | 'NONE';
  /** Editing an existing draft: sending updates it instead of creating a new quote. */
  id?: string;
}

export const DEFAULT_TERMS =
  'Pagamento: 50% no início, 50% na entrega. Garantia de 90 dias sobre a mão de obra.';

export const emptyDraft = (): Draft => ({
  client: null,
  items: [],
  discountType: 'PERCENT',
  discountDigits: '',
  validityDays: 15,
  terms: '',
  signature: { mode: 'none' },
  savedSignature: undefined,
  priceDisplay: 'ITEMS',
});

const Ctx = createContext<{
  draft: Draft;
  setDraft: React.Dispatch<React.SetStateAction<Draft>>;
} | null>(null);

export function DraftProvider({ children }: { children: React.ReactNode }) {
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  return <Ctx.Provider value={{ draft, setDraft }}>{children}</Ctx.Provider>;
}

const NO_DRAFT = { draft: emptyDraft(), setDraft: () => {} };

/** Outside the easy stack (e.g. the signature screen opened from the full app) there is no draft. */
export function useDraft() {
  return useContext(Ctx) ?? NO_DRAFT;
}

export const centsToDecimal = (digits: string) => {
  const n = digits.replace(/\D/g, '').replace(/^0+/, '') || '0';
  const padded = n.padStart(3, '0');
  return `${padded.slice(0, -2)}.${padded.slice(-2)}`;
};

/** "690.5" → "69050" (digits of a money field). */
const decimalToDigits = (v: string) => {
  const [a, b = ''] = v.split('.');
  return `${a}${b.padEnd(2, '0').slice(0, 2)}`.replace(/^0+/, '');
};

/** A draft quote (corrected or never sent) back in the 3 steps. */
export function draftFromQuote(q: EasyQuoteFull): Draft {
  const days = q.valid_until
    ? Math.round((new Date(q.valid_until).getTime() - Date.now()) / 86_400_000)
    : 0;
  return {
    ...emptyDraft(),
    id: q.id,
    client: { id: q.customer.id, name: q.customer.name, phone: q.customer.phone ?? null },
    items: q.items.map((i, n) => ({
      key: i.catalog_item_id ?? `q${n}`,
      catalog_item_id: i.catalog_item_id ?? undefined,
      name: i.description,
      price: centsToDecimal(decimalToDigits(i.unit_price)),
      qty: Number(i.quantity),
    })),
    discountType: q.discount_type,
    discountDigits:
      Number(q.discount_value) === 0
        ? ''
        : q.discount_type === 'PERCENT'
          ? String(Number(q.discount_value))
          : decimalToDigits(q.discount_value),
    validityDays: days > 0 ? days : 15,
    terms: q.notes ?? '',
    priceDisplay: q.price_display ?? 'ITEMS',
  };
}

/** Same math as the web Modo fácil (display only; the backend recomputes). */
export function useTotals(draft: Draft) {
  return useMemo(() => {
    const subtotal = draft.items.length
      ? sumDecimal(draft.items.map((i) => multiplyDecimal(i.price, String(i.qty))))
      : '0.00';
    let discount = '0.00';
    if (draft.discountDigits) {
      if (draft.discountType === 'PERCENT') {
        const pct = Math.min(Number(draft.discountDigits), 100);
        discount = multiplyDecimal(subtotal, (pct / 100).toFixed(4));
      } else {
        const fixed = centsToDecimal(draft.discountDigits);
        discount = Number(fixed) > Number(subtotal) ? subtotal : fixed;
      }
    }
    const total = sumDecimal([subtotal, `-${discount}`]);
    return { subtotal, discount, total: total.startsWith('-') ? '0.00' : total };
  }, [draft]);
}

export const approvalUrl = (token: string) => `${WEB_URL}/approve/${token}`;

/** Opens WhatsApp with the approval link (same message as the web). */
export function openWhatsApp(phone: string | null | undefined, url: string, quoteName: string) {
  const digits = (phone ?? '').replace(/\D/g, '');
  const text = encodeURIComponent(
    `Olá! Segue o orçamento "${quoteName}" para sua aprovação:\n${url}`,
  );
  const to = digits ? `55${digits.replace(/^55(?=\d{10,11}$)/, '')}` : '';
  return Linking.openURL(`https://wa.me/${to}?text=${text}`);
}
