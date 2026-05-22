# ADR-012 — 2FA/TOTP deferido para fase de segurança

**Status:** Aceito
**Data:** 2026-05-22
**Fase:** 1 — Vertical Slice

## Contexto

A Fase 1 implementa o molde arquitetural de autenticação (signup, login, refresh, logout). 2FA via TOTP (Time-based One-Time Password) é uma feature de segurança desejável mas não é necessária para validar o molde arquitetural.

## Decisão

**Não implementar 2FA/TOTP na Fase 1.**

## Justificativa

- 2FA não impacta o molde arquitetural (auth flow, TenantGuard, JWT, multi-tenant isolation)
- Adiciona complexidade de UX (QR code, app autenticador, recovery codes) sem benefício para o MVP
- O público inicial são técnicos instaladores — o risco de adoção cai com barreiras extras no onboarding
- Pode ser adicionado de forma não-destrutiva em fase futura (basta adicionar coluna `totp_secret` em `users` e middleware de verificação)

## Consequências

- Auth mais simples para o MVP
- Deve ser implementado antes de produção real com dados sensíveis de clientes
- Registrar como requisito de segurança para Fase de Segurança dedicada (pré-produção)
