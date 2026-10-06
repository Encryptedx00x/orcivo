import React, { createContext, useContext, useMemo, useState } from 'react';
import { Linking } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { multiplyDecimal, sumDecimal } from '@orcivo/shared-types';
import type { EasyClient } from './data';
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
  validityDays: 7 | 15 | 30;
  terms: string;
  signature: SignatureChoice;
  /** null until the saved signature was checked on the review step. */
  savedSignature: string | null | undefined;
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
});

const Ctx = createContext<{
  draft: Draft;
  setDraft: React.Dispatch<React.SetStateAction<Draft>>;
} | null>(null);

export function DraftProvider({ children }: { children: React.ReactNode }) {
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  return <Ctx.Provider value={{ draft, setDraft }}>{children}</Ctx.Provider>;
}

export function useDraft() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useDraft outside DraftProvider');
  return v;
}

export const centsToDecimal = (digits: string) => {
  const n = digits.replace(/\D/g, '').replace(/^0+/, '') || '0';
  const padded = n.padStart(3, '0');
  return `${padded.slice(0, -2)}.${padded.slice(-2)}`;
};

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
