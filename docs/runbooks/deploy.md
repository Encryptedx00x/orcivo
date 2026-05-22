# Runbook — Deploy na VPS

**Pré-requisito:** Stack core rodando (docs/runbooks/stack-setup.md)

---

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
