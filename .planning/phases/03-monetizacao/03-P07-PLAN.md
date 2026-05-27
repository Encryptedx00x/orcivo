# 03-P07 — Banner de inadimplência mobile + web

## Goal
Exibir banner de inadimplência no app mobile e na web quando `subscription_status` for `PAST_DUE` ou `BLOCKED`, com mensagem neutra que não mencione preço ou "fora do app".

## Wave
4 (depende de 03-P05 para o endpoint `/me/subscription-status`)

## Context
- **Regra Apple/Google:** Nunca mencionar "pague fora do app", nunca mostrar preço no mobile
- Mensagem BLOCKED: "Sua assinatura está inativa. Acesse orcivo.com.br para regularizar."
- Mensagem PAST_DUE: "Há um pagamento pendente. Acesse orcivo.com.br para regularizar."
- Inadimplente pode ver dados — apenas criar/modificar é bloqueado

## Tasks

### T1 — SubscriptionContext no mobile

Criar `apps/mobile/src/contexts/SubscriptionContext.tsx`:

```typescript
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api } from '../services/api';

interface SubscriptionState {
  status: string | null;      // 'ACTIVE' | 'PAST_DUE' | 'BLOCKED' | null
  is_blocked: boolean;
  is_past_due: boolean;
  message: string | null;
  plan_code: string;
  loading: boolean;
}

const SubscriptionContext = createContext<SubscriptionState & { refresh: () => void }>({
  status: null, is_blocked: false, is_past_due: false, message: null, plan_code: 'LIVRE', loading: true,
  refresh: () => {},
});

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<SubscriptionState>({
    status: null, is_blocked: false, is_past_due: false, message: null, plan_code: 'LIVRE', loading: true,
  });

  const fetch = useCallback(async () => {
    try {
      const data = await api.get<SubscriptionState>('/me/subscription-status');
      setState({ ...data, loading: false });
    } catch {
      setState(s => ({ ...s, loading: false }));
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  return (
    <SubscriptionContext.Provider value={{ ...state, refresh: fetch }}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export const useSubscription = () => useContext(SubscriptionContext);
```

Envolver `AppTabs` com `<SubscriptionProvider>` em `App.tsx`.

### T2 — SubscriptionBanner component (mobile)

Criar `apps/mobile/src/components/SubscriptionBanner.tsx`:

```typescript
import React from 'react';
import { View, Text, TouchableOpacity, Linking, StyleSheet } from 'react-native';
import { AlertTriangle } from 'lucide-react-native';
import { useSubscription } from '../contexts/SubscriptionContext';

export function SubscriptionBanner() {
  const { is_blocked, is_past_due, message } = useSubscription();

  if (!is_blocked && !is_past_due) return null;

  const color = is_blocked ? '#DC2626' : '#D97706'; // vermelho | âmbar

  return (
    <View style={[styles.container, { backgroundColor: color }]}>
      <AlertTriangle size={16} color="#FFFFFF" />
      <Text style={styles.text}>{message}</Text>
      <TouchableOpacity onPress={() => Linking.openURL('https://orcivo.com.br/planos')}>
        <Text style={styles.link}>Ver planos</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, paddingHorizontal: 16 },
  text: { color: '#FFFFFF', fontSize: 13, flex: 1 },
  link: { color: '#FFFFFF', fontSize: 13, fontWeight: '600', textDecorationLine: 'underline' },
});
```

Adicionar `<SubscriptionBanner />` no topo do layout principal do AppTabs (antes dos screens).

### T3 — SubscriptionBanner component (web)

Criar `apps/web/components/SubscriptionBanner.tsx`:

```typescript
'use client';
import { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import Link from 'next/link';

interface SubStatus {
  is_blocked: boolean;
  is_past_due: boolean;
  message: string | null;
}

export function SubscriptionBanner() {
  const [status, setStatus] = useState<SubStatus | null>(null);

  useEffect(() => {
    fetch('/api/me/subscription-status')
      .then(r => r.json())
      .then(setStatus)
      .catch(() => {});
  }, []);

  if (!status?.is_blocked && !status?.is_past_due) return null;

  const color = status.is_blocked ? 'bg-red-600' : 'bg-amber-500';

  return (
    <div className={`${color} text-white px-4 py-3 flex items-center gap-3`}>
      <AlertTriangle size={16} />
      <span className="text-sm flex-1">{status.message}</span>
      <Link href="/planos" className="text-sm font-semibold underline whitespace-nowrap">
        Ver planos
      </Link>
    </div>
  );
}
```

Adicionar `<SubscriptionBanner />` no topo do `AppSidebar` ou no `layout.tsx` do `(app)` group.

### T4 — Proxy /api/me/* na web

Em `apps/web/app/api/me/subscription-status/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
  const cookieStore = cookies();
  const token = cookieStore.get('access_token')?.value;
  if (!token) return NextResponse.json({ is_blocked: false, is_past_due: false, message: null });

  const res = await fetch(`${process.env.BACKEND_URL}/me/subscription-status`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) return NextResponse.json({ is_blocked: false, is_past_due: false, message: null });
  return NextResponse.json(await res.json());
}
```

## Verification

```bash
# TypeCheck mobile
cd apps/mobile && npx tsc --noEmit 2>/dev/null || true

# TypeCheck web
cd apps/web && npx tsc --noEmit

# Banner existe
ls apps/mobile/src/components/SubscriptionBanner.tsx
ls apps/web/components/SubscriptionBanner.tsx

# Sem preço no mobile
grep -r "R\$\|reais\|mensal\|anual" apps/mobile/src/components/SubscriptionBanner.tsx && echo "FALHOU" || echo "OK"

# Sem "evite taxa" ou "mais barato"
grep -ri "evite taxa\|mais barato\|fora do app" apps/mobile/src/ && echo "FALHOU" || echo "OK"
```

## Notes
- URL do site no banner: `https://orcivo.com.br/planos` (placeholder — atualizar quando domínio for configurado)
- O banner de PAST_DUE usa âmbar (warning), BLOCKED usa vermelho (error)
- Usuário LIVRE sempre tem `status: null` → banner nunca aparece para plano grátis
