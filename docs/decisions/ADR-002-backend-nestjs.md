# ADR-002 — Backend com NestJS + Prisma

**Status:** Accepted
**Data:** 2026-05-21
**Autores:** Dyogo Holanda

## Contexto

O backend do Orcivo precisa expor uma API REST consumida por mobile e web, gerenciar autenticação multi-tenant, orquestrar regras de negócio complexas (OS, checklists, faturamento) e integrar com serviços externos (Asaas, MinIO). Frameworks minimalistas como Express/Fastify exigiriam construir essa estrutura do zero.

## Decisão

Usar NestJS como framework backend com TypeScript, Prisma como ORM/migration tool e PostgreSQL 16 como banco de dados.

- Módulos NestJS para separação de responsabilidades (AuthModule, CompanyModule, etc.)
- Prisma para schema-first database, migrations determinísticas e type-safe queries
- Decorators NestJS para guards, interceptors, pipes e validators

## Consequências

**Positivas:**
- Injeção de dependência nativa reduz acoplamento e facilita testes
- Estrutura modular clara — cada domínio é um módulo isolado
- Ecosystem maduro: Passport, class-validator, Swagger/OpenAPI out-of-the-box
- Prisma gera tipos TypeScript diretamente do schema — sem ORMs verbosos

**Negativas / trade-offs:**
- Mais estrutura do que projetos simples precisam — curva de aprendizado para NestJS
- Decorators podem obscurecer fluxo de execução para quem não conhece o framework
- Prisma Client não pode ser importado fora do backend (regra shared-types)
