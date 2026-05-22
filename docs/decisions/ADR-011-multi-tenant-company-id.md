# ADR-011 — Multi-tenancy por company_id em todas as tabelas

**Status:** Accepted
**Data:** 2026-05-21
**Autores:** Dyogo Holanda

## Contexto

O Orcivo é um produto B2B multi-tenant: múltiplas empresas de instalação compartilham a mesma instância do banco de dados. O isolamento de dados entre tenants é um requisito crítico de segurança — dados de um tenant nunca podem vazar para outro.

## Decisão

Usar row-level isolation via company_id: toda tabela de negócio tem uma coluna `company_id` obrigatória (NOT NULL, FK para a tabela `companies`). Sem schema-per-tenant (overhead de conexão e migrations) ou database-per-tenant (custo de infra).

TenantGuard no NestJS valida e injeta o company_id a cada request. Nenhuma query de domínio pode ser executada sem filtro de tenant.

## Consequências

**Positivas:**
- Modelo simples e escalável — um único banco serve N tenants
- Prisma facilita enforcement: `where: { company_id: ctx.companyId }` em todas as queries
- TenantGuard centraliza a lógica de extração e validação do tenant
- Migrations aplicadas uma vez para todos os tenants

**Negativas / trade-offs:**
- Risco de query sem filtro de company_id — desenvolvedor pode esquecer o WHERE
- Mitigação: TenantGuard obrigatório em todos os endpoints protegidos; testes de isolamento em CI
- Backup por tenant é mais complexo (não é possível fazer dump de um schema isolado)
- Queries cross-tenant (analytics agregado, suporte admin) requerem bypass explícito e auditado
