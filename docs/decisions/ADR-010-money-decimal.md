# ADR-010 — Valores monetários como Prisma.Decimal / string / Decimal.js

**Status:** Accepted
**Data:** 2026-05-21
**Autores:** Dyogo Holanda

## Contexto

JavaScript `number` usa IEEE 754 floating-point, que introduz erros de precisão em operações decimais (ex: `0.1 + 0.2 !== 0.3`). Para um produto financeiro, erros de arredondamento em cobranças são inaceitáveis e podem gerar problemas legais e de reputação.

## Decisão

Representação de valores monetários em cada camada:

- **Backend (Prisma):** tipo `Decimal` no schema Prisma → `Prisma.Decimal` no TypeScript. Nunca `Float`.
- **API JSON:** string decimal (ex: `"150.00"`) — preserva precisão sem depender do tipo number do JSON
- **Mobile e Web:** `Decimal.js` para operações aritméticas. Nunca `number` para cálculos monetários.

Proibido: `number`, `float`, `parseFloat` para armazenar ou calcular valores monetários.

## Consequências

**Positivas:**
- Precisão garantida em toda a stack — sem erros de arredondamento
- Tipo explícito evita bugs silenciosos por conversão implícita
- Prisma.Decimal é serializado corretamente para string no JSON

**Negativas / trade-offs:**
- Verbosidade: conversões explícitas necessárias ao cruzar camadas (`new Decimal(str)`)
- Decimal.js adiciona dependência no mobile/web
- Desenvolvedores precisam ser treinados para nunca usar `number` em contexto monetário
- Comparações simples (`price > 0`) exigem sintaxe de Decimal (`price.greaterThan(0)`)
