# ADR-005 — Banco de dados PostgreSQL 16

**Status:** Accepted
**Data:** 2026-05-21
**Autores:** Dyogo Holanda

## Contexto

O modelo de domínio do Orcivo é relacional: empresas, técnicos, clientes, OS, checklists, itens, fotos. Multi-tenancy exige isolamento por company_id. Operações financeiras exigem ACID. Configurações flexíveis de checklist sugerem uso pontual de JSON.

## Decisão

PostgreSQL 16 como banco principal, self-hosted via Docker no VPS. Prisma como ORM e migration tool. Sem NoSQL nas fases 0-3. Redis para cache de sessão e rate limiting (não como banco primário).

## Consequências

**Positivas:**
- ACID nativo — crítico para operações financeiras e idempotência de webhooks
- JSONB para configurações flexíveis sem sacrificar integridade relacional
- Prisma migrations são determinísticas e versionadas no repositório
- PostgreSQL 16 tem melhorias significativas em performance de queries paralelas

**Negativas / trade-offs:**
- Self-hosted aumenta responsabilidade operacional: backup, monitoring, tuning
- Sem auto-scaling de banco — gargalo potencial acima de ~500 tenants ativos simultâneos
- Migração para RDS/managed postgres no futuro requer ajustes de infra (sem mudança de código)
