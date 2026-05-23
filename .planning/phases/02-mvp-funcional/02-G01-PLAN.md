---
phase: "2A"
plan: "02-G01"
title: "Gap closure — Orçamentos mobile: registrar telas no navigator"
wave: 1
autonomous: true
gap_closure: true
closes_gap: "Mobile QuoteListScreen/QuoteDetailScreen/QuoteCreateScreen orphaned — aba Orçamentos aponta para EmBreveScreen"
files_modified:
  - apps/mobile/src/navigation/AppTabs.tsx
---

<objective>
Corrigir o wiring das telas de Orçamento no navigator mobile.

As telas QuoteListScreen, QuoteDetailScreen e QuoteCreateScreen foram criadas no P09 mas não foram registradas em nenhum navigator. A aba "Orçamentos" (tab index 2) aponta para EmBreveScreen.

Solução: criar um QuoteNavigator (stack com as 3 telas) e substituir EmBreveScreen na aba Orçamentos por esse navigator — mesmo padrão do ClientesNavigator.
</objective>

<must_haves>
- [ ] AppTabs.tsx importa QuoteListScreen, QuoteDetailScreen, QuoteCreateScreen
- [ ] Existe um QuoteNavigator (NativeStackNavigator) com as 3 telas registradas
- [ ] Aba "Orçamentos" no Tab.Navigator usa o QuoteNavigator (não EmBreveScreen)
- [ ] Nomes de Screen consistentes: QuotesList, QuoteDetail, QuoteCreate
- [ ] headerTintColor: '#6D28D9' nos screens do stack (padrão Orcivo)
- [ ] Nenhuma tela importada ou criada — apenas wiring de navegação
</must_haves>

<tasks>
## Task 1 — Atualizar AppTabs.tsx

**Arquivo:** `apps/mobile/src/navigation/AppTabs.tsx`

Adicionar imports:
```ts
import { QuoteListScreen } from '../screens/QuoteListScreen';
import { QuoteDetailScreen } from '../screens/QuoteDetailScreen';
import { QuoteCreateScreen } from '../screens/QuoteCreateScreen';
```

Adicionar `const QuotesStack = createNativeStackNavigator();` (já existe `createNativeStackNavigator` — reutilizar o import existente).

Criar função `QuotesNavigator`:
```tsx
function QuotesNavigator() {
  return (
    <QuotesStack.Navigator screenOptions={{ headerTintColor: '#6D28D9' }}>
      <QuotesStack.Screen name="QuotesList" component={QuoteListScreen} options={{ title: 'Orçamentos' }} />
      <QuotesStack.Screen name="QuoteDetail" component={QuoteDetailScreen} options={{ title: 'Orçamento' }} />
      <QuotesStack.Screen name="QuoteCreate" component={QuoteCreateScreen} options={{ title: 'Novo orçamento' }} />
    </QuotesStack.Navigator>
  );
}
```

Substituir na Tab.Navigator:
```tsx
// ANTES:
<Tab.Screen name="Orçamentos" component={EmBreveScreen} ... />

// DEPOIS:
<Tab.Screen name="Orçamentos" component={QuotesNavigator} ... />
```

Commit: `feat(2A-G01): wire QuoteNavigator — aba Orçamentos mobile funcional`

**Self-check:** `grep "QuoteListScreen\|QuotesNavigator" apps/mobile/src/navigation/AppTabs.tsx` — ambos presentes.
</tasks>
