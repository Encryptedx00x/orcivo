# ADR-003 — Mobile com React Native + Expo SDK

**Status:** Accepted
**Data:** 2026-05-21
**Autores:** Dyogo Holanda

## Contexto

O app mobile é a superfície primária do técnico em campo. Precisa rodar em Android (iOS planejado para Fase 7), capturar fotos, assinar digitalmente ordens de serviço e funcionar com conectividade instável. A produtividade de desenvolvimento é crítica — o time é pequeno.

## Decisão

Usar React Native com Expo SDK. EAS Build para geração de APK/IPA sem máquina local. TypeScript obrigatório. Compartilhar types com backend via @orcivo/shared-types.

## Consequências

**Positivas:**
- Expo acelera setup: sem Android Studio para builds em CI, sem configuração de Xcode inicial
- EAS Build gerencia assinatura e distribuição de APK para Android
- Hot reload nativo e Expo Go para desenvolvimento rápido
- Compartilhamento de types com backend via workspace — sem duplicação de contratos

**Negativas / trade-offs:**
- Sem acesso a módulos nativos não suportados pelo Expo SDK sem ejetar (bare workflow)
- EAS Build tem plano gratuito com build concurrency limitada
- Dependência de Expo SDK para updates — versões precisam ser mantidas sincronizadas
