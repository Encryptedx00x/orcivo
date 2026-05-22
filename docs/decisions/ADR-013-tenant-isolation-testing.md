# ADR-013 — Estratégia de Teste de Isolamento Multi-Tenant em CI

**Status:** Accepted
**Data:** 2026-05-22
**Autores:** Dyogo Holanda

## Contexto

O Orcivo é um SaaS multi-tenant onde o vazamento de dados entre empresas (tenants) é a falha de segurança mais crítica possível. Uma regressão silenciosa no `TenantGuard` ou em qualquer query Prisma poderia expor dados de clientes de uma empresa para outra.

Precisamos de um gate automático no CI que:
1. Detecte regressões de isolamento antes de qualquer merge
2. Use banco de dados real (não mocks) para testar o comportamento real do Postgres
3. Seja replicável para cada novo módulo de domínio

## Decisão

Adotar o **padrão de teste de isolamento com dois tenants reais** em ambiente Postgres + Redis reais, executado no CI via GitHub Actions services.

### Estrutura do teste

Cada módulo de domínio que expõe dados com escopo de tenant deve ter um arquivo `{dominio}.isolation.spec.ts` que:

1. Cria dois tenants completos (usuário + empresa) via API HTTP
2. Cria um recurso pertencente ao Tenant B
3. Verifica que o Tenant A **não pode listar** recursos do Tenant B (lista vazia)
4. Verifica que o Tenant A **recebe 404** (não 403) ao tentar acessar recurso do Tenant B por ID

Retornar 404 é intencional: não revelar que o recurso existe para outro tenant.

### CI via GitHub Actions

O job `test` no arquivo `.github/workflows/backend.yml` sobe Postgres 16 e Redis 7 como `services` nativos do GitHub Actions. Antes dos testes:

- `prisma generate` compila o Prisma Client
- `prisma db push --force-reset` aplica o schema no banco efêmero

Os testes rodam com `pnpm test:ci` (jest `--runInBand`) para serializar os testes de integração e evitar condições de corrida.

### Banco local para desenvolvimento

O arquivo `infra/docker-compose.test.yml` espelha o ambiente de CI com Postgres na porta 5433 e Redis na porta 6380 (para não conflitar com os serviços de desenvolvimento na 5432/6379).

## Consequências

**Positivas:**
- Regressões de isolamento bloqueiam o merge automaticamente (CI vermelho)
- Testes usam banco real — sem falsos positivos por mocks
- Padrão replicável: qualquer feature nova tem um template claro a seguir
- `--runInBand` garante que testes de integração com estado compartilhado não interfiram entre si

**Negativas / trade-offs:**
- CI mais lento (+30-60s para subir os services e aplicar o schema)
- Testes de isolamento requerem bootstrap completo do NestJS + Prisma + Redis
- `getTestApp()` em `test/setup.ts` compartilhado — mudanças no AppModule afetam todos os testes e2e

## Alternativas consideradas

**Mocks do PrismaService:** Descartado — mocks não testam o comportamento real de queries Prisma. Uma regressão no schema (ex: remoção acidental de `company_id` de um índice) passaria invisível.

**Banco SQLite em memória:** Descartado — comportamento de queries difere do Postgres (ex: `mode: 'insensitive'` não existe no SQLite). A paridade com produção é obrigatória para testes de segurança.
