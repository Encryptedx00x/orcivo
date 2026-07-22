# Runbook — Deploy na VPS

**Pré-requisito:** Stack core rodando (docs/runbooks/stack-setup.md)

---

## Imagens suportadas

A topologia atual possui imagens versionadas para `backend` e `web`. O app
`site` ainda não integra o Compose nem o Caddy e deve ser validado com o build
local do workspace; a definição de Dockerfile, porta e rota do site permanece
como gap de infraestrutura posterior.

## Argumentos públicos do build web

Defina `NEXT_PUBLIC_API_URL` e `NEXT_PUBLIC_WEB_URL` em `infra/.env` antes de
construir a imagem. O Next.js incorpora essas URLs públicas no bundle durante o
build; alterá-las somente no runtime não atualiza o cliente. Não use essas
variáveis para secrets.

## Primeiro deploy

```bash
# Na VPS como usuário não-root
cd /opt/orcivo

# Clonar o repositório
git clone https://github.com/Encryptedx00x/orcivo.git .

# Build e subida dos serviços
cd infra
docker compose up -d --build backend web
docker compose ps  # verificar que backend e web estão Up
```

## Deploy de atualização (após push no GitHub)

```bash
# Na VPS
cd /opt/orcivo

# Atualizar código
git pull origin main

# Rebuild e restart apenas dos serviços alterados
cd infra
docker compose up -d --build backend
# ou
docker compose up -d --build web
# ou ambos
docker compose up -d --build backend web

# Verificar logs
docker compose logs --tail=50 backend
docker compose logs --tail=50 web
```

## Verificação pós-deploy

```bash
# Health check do backend
curl https://api.seudominio.com.br/health
# Expected: {"status":"ok","timestamp":"..."}

# Web app
curl -I https://app.seudominio.com.br
# Expected: HTTP/2 200

# Status de todos os containers
docker compose ps
```

## Rollback

```bash
cd /opt/orcivo

# Ver histórico de commits
git log --oneline -10

# Reverter para commit anterior
git checkout <hash-do-commit-anterior>
cd infra && docker compose up -d --build backend web
```

## Logs em produção

```bash
# Backend em tempo real
docker compose logs -f backend

# Web em tempo real
docker compose logs -f web

# Todos os serviços
docker compose logs -f
```
