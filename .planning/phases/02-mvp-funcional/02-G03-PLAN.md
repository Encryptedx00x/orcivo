---
phase: "2A"
plan: "02-G03"
title: "Gap closure — Prisma migrations: gerar e versionar no git"
wave: 1
autonomous: true
gap_closure: true
closes_gap: "prisma/migrations/ não existe — migrate dev não commitado, schema não reproduzível"
files_modified:
  - prisma/migrations/
---

<objective>
Gerar e commitar as Prisma migrations da Fase 2A.

O diretório `prisma/migrations/` não existe no repositório. Sem migrations, o schema não é reproduzível para CI ou deploy. É necessário executar `prisma migrate dev` para gerar os arquivos de migration e commitá-los.

ATENÇÃO: Este plano exige acesso ao banco PostgreSQL local (via Docker Compose). Se o banco não estiver rodando, executar `docker compose up -d postgres` primeiro.
</objective>

<must_haves>
- [ ] `prisma/migrations/` existe com pelo menos 1 migration gerada
- [ ] Cada migration tem `migration.sql` com os CREATE TABLE / ALTER TABLE da Fase 2A
- [ ] O diretório `prisma/migrations/` está rastreado no git (commitado)
- [ ] `prisma validate` passa após a migration
</must_haves>

<tasks>
## Task 1 — Gerar migration e commitar

**Pré-condição:** PostgreSQL rodando. Verificar:
```bash
docker compose ps postgres 2>/dev/null | grep "Up" || echo "POSTGRES_DOWN"
```

Se postgres não estiver Up: `docker compose up -d postgres` e aguardar ~5s.

**Gerar migration:**
```bash
npx prisma migrate dev --name phase-2a
```

Este comando:
1. Compara o schema.prisma atual com o estado do banco
2. Gera `prisma/migrations/<timestamp>_phase-2a/migration.sql`
3. Aplica a migration ao banco local
4. Atualiza o Prisma Client

**Se o banco já tiver as tabelas** (via `db push` anterior), o prisma pode gerar uma migration vazia ou com apenas as diferenças. Isso é aceitável — o importante é que `prisma/migrations/` exista e seja versionado.

**Se o prisma reportar "Already in sync":** Forçar baseline:
```bash
npx prisma migrate dev --name phase-2a --create-only
```
Depois aplicar: `npx prisma migrate deploy`

**Validar:**
```bash
npx prisma validate
ls prisma/migrations/
```

**Commitar migrations:**
```bash
git add prisma/migrations/
git commit -m "chore(2A-G03): versionar prisma migrations phase-2a"
```

**Self-check:** `ls prisma/migrations/` — retorna pelo menos 1 diretório com `migration.sql`.
</tasks>
