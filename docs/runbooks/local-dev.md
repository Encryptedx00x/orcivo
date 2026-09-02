# Desenvolvimento Local — Orcivo

Guia completo para rodar o Orcivo localmente e executar o UAT da Fase 1.

## Pré-requisitos

| Ferramenta        | Versão mínima | Verificar                          |
| ----------------- | ------------- | ---------------------------------- |
| Node.js           | 20            | `node -v`                          |
| pnpm              | 9             | `pnpm -v`                          |
| Docker Desktop    | qualquer      | `docker -v`                        |
| Expo Go (celular) | —             | instalar na Play Store / App Store |

---

## 1. Setup inicial (uma vez)

```bash
# Clone e instale dependências
git clone <repo>
cd orcivo
pnpm install

# Compilar shared-types (OBRIGATÓRIO antes de qualquer app)
pnpm --filter @orcivo/shared-types build

# Backend: copiar .env
cp apps/backend/.env.example apps/backend/.env
# Editar apps/backend/.env se quiser senhas customizadas

# Web: copiar .env.local
cp apps/web/.env.local.example apps/web/.env.local

# Mobile: copiar .env
cp apps/mobile/.env.example apps/mobile/.env
```

> **Por que compilar shared-types?** O backend, web e mobile importam `@orcivo/shared-types`
> via `dist/index.js` (CommonJS). Sem o build, Node não encontra o módulo em runtime.
> Os scripts `dev:backend`, `dev:web` e `dev:mobile` compilam shared-types automaticamente
> antes de iniciar — mas na primeira vez é bom fazer manualmente para verificar erros.

---

## 2. Subir infraestrutura (Postgres + Redis)

**Requer Docker Desktop rodando.**

```bash
# Postgres (host 5544 -> 5432), Redis (6379), MinIO (9000/9001)
pnpm dev:infra
docker ps   # orcivo_postgres_dev / orcivo_redis_dev / orcivo_minio_dev  (healthy)
```

> Postgres publica **5544** no host (5432 costuma colidir com um PostgreSQL
> nativo do Windows). `apps/backend/.env.example` e `prisma/.env` já usam 5544.
> Se o `.env` antigo apontar para `/orcivo` na 5432, copie o example de novo:
> `copy apps\backend\.env.example apps\backend\.env`

---

## 3. Aplicar o schema no banco

```bash
# Gerar o Prisma Client
npx prisma generate

# Aplicar as migrations versionadas no banco de desenvolvimento
npx prisma migrate deploy
```

> Use `prisma migrate deploy`, não `prisma db push`. As migrations em
> `prisma/migrations/` são a fonte única de reprodução do schema.

---

## 4. Rodar o backend

**Terminal 1:**

```bash
pnpm dev:backend
```

Saída esperada:

```
Backend rodando na porta 3000
```

Verificar: `curl http://localhost:3000/health` → `{"status":"ok"}`

---

## 5. Rodar o web

**Terminal 2:**

```bash
pnpm dev:web
```

URL: **http://localhost:3001**

---

## 6. Rodar o mobile

**Terminal 3:**

```bash
# Abre o Metro Bundler com QR Code
pnpm dev:mobile

# Alternativas:
pnpm dev:mobile:android  # abre direto no emulador Android
pnpm dev:mobile:ios      # abre direto no simulador iOS (macOS)
```

Para testar no celular: escanear o QR Code com o app **Expo Go**.

> **Android físico:** o app usa `http://localhost:3000` por padrão. Em device físico, trocar `EXPO_PUBLIC_API_URL` em `apps/mobile/.env` para o IP local da máquina (ex: `http://192.168.1.100:3000`).

---

## 7. Fluxo de UAT — Fase 1

### Ordem correta de execução

1. `pnpm dev:infra` — Postgres + Redis
2. `npx prisma migrate deploy` — schema no banco
3. `pnpm dev:backend` — API em :3000
4. `pnpm dev:web` OU `pnpm dev:mobile` — cliente

### UAT Web (http://localhost:3001)

| Teste                     | Passos                                                    | Esperado                                                                                          |
| ------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Redirecionamento sem auth | Abrir http://localhost:3001 sem login                     | Redirecionar para /login                                                                          |
| Signup step 1             | Ir para /signup, preencher nome, e-mail, telefone, senha  | Avançar para step 2                                                                               |
| Signup step 2             | Preencher nome da empresa, documento, cidade, estado      | Login automático, sidebar aparece                                                                 |
| Sidebar 9 itens           | Verificar sidebar após login                              | Início, Clientes, Ordens de Serviço, Agenda, Técnicos, Relatórios, Estoque, Planos, Configurações |
| Criar cliente             | Clicar Clientes → Novo Cliente, preencher nome e telefone | Cliente aparece na listagem                                                                       |
| Logout                    | Clicar logout                                             | Cookie removido, redirecionado para /login                                                        |

### UAT Mobile (Expo Go)

| Teste         | Passos                                        | Esperado                               |
| ------------- | --------------------------------------------- | -------------------------------------- |
| Tela inicial  | Abrir app sem login                           | LoginScreen exibida                    |
| Signup step 1 | Navegar para signup, preencher dados pessoais | Avançar para step 2                    |
| Signup step 2 | Preencher dados da empresa                    | Login automático, 5 tabs aparecem      |
| 5 tabs        | Verificar bottom tabs                         | Agenda, Clientes, Ordens, Mais, Config |
| Criar cliente | Tab Clientes → +                              | Formulário de criação, salvar          |
| Tab Mais      | Pressionar tab Mais                           | Stack com 9 itens                      |

### UAT CI (GitHub Actions)

```bash
# Push para qualquer branch e abrir PR contra main
git push origin gsd/phase-1

# No GitHub: Actions → "Backend CI" → job "Test (with Postgres + Redis)"
# Esperado: verde, log mostra "Tests: 2 passed" (customer.isolation.spec.ts)
```

---

## 8. Rodar testes de isolamento localmente

`infra/docker-compose.test.yml` sobe Postgres (5433), Redis (6380) e MinIO (9002)
em portas isoladas do dev. `apps/backend/.env.test.example` já está alinhado a
essas portas.

```bash
# 1. Config de teste (uma vez)
cp apps/backend/.env.test.example apps/backend/.env.test

# 2. Subir infra de teste
docker compose -f infra/docker-compose.test.yml up -d

# 3. Aplicar migrations versionadas (NÃO db push)
DATABASE_URL=postgresql://orcivo:orcivo@localhost:5433/orcivo_test npx prisma migrate deploy

# 4. Rodar a suíte
pnpm --filter @orcivo/backend test:ci
```

Setup manual alternativo (sem `.env.test`), dentro de `apps/backend`:

```bash
DATABASE_URL_TEST=postgresql://orcivo:orcivo@localhost:5433/orcivo_test \
DATABASE_URL=postgresql://orcivo:orcivo@localhost:5433/orcivo_test \
JWT_ACCESS_SECRET=local-test-access \
JWT_REFRESH_SECRET=local-test-refresh \
REDIS_HOST=localhost \
REDIS_PORT=6380 \
pnpm test:ci

# Limpar
docker compose -f infra/docker-compose.test.yml down
```

---

## 9. Encerrar tudo

```bash
# Parar infra de dev
pnpm dev:infra:down

# Parar infra de teste
docker compose -f infra/docker-compose.test.yml down
```

---

## Por que não existe `dev:all`?

`dev:all` que execute backend + web + mobile simultaneamente seria frágil porque:

1. **Ordem de dependência**: infra (Docker) → Prisma push → backend → web/mobile. Automatizar isso sem checar health seria silencioso em falhas.
2. **Logs misturados**: os três processos no mesmo terminal dificultam debug.
3. **Mobile é opcional**: a maioria dos fluxos de desenvolvimento web não requer o Metro Bundler rodando.

Recomendação: **3 terminais**, um por app. Ou use o painel de terminais do VS Code com split view.
