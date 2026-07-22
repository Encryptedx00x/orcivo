# Runbook — Stack Core Orcivo (D0.3)

**Pré-requisito:** VPS provisionada conforme `docs/runbooks/vps-setup.md`
**Pré-requisito:** Domínio registrado e DNS configurado (ver abaixo)

---

## 1. Configurar DNS

No painel do seu registrador de domínio, criar registros A apontando para o IP da VPS:

| Subdomínio | Tipo | Valor | TTL |
|---|---|---|---|
| api | A | <IP_DA_VPS> | 300 |
| app | A | <IP_DA_VPS> | 300 |
| www | A | <IP_DA_VPS> | 300 |
| storage | A | <IP_DA_VPS> | 300 |
| s3 | A | <IP_DA_VPS> | 300 |
| admin | A | <IP_DA_VPS> | 300 |
| status | A | <IP_DA_VPS> | 300 |

Aguardar propagação DNS (5–30 minutos). Verificar:

```bash
dig api.seudominio.com.br +short  # deve retornar o IP da VPS
```

## 2. Copiar arquivos para a VPS

No seu computador local:

```bash
# Criar diretório na VPS
ssh dyogo@<IP_DA_VPS> "mkdir -p /opt/orcivo/infra/scripts"

# Copiar arquivos de infra
scp infra/docker-compose.yml dyogo@<IP_DA_VPS>:/opt/orcivo/infra/
scp infra/Caddyfile dyogo@<IP_DA_VPS>:/opt/orcivo/infra/
scp infra/scripts/backup-volumes.sh dyogo@<IP_DA_VPS>:/opt/orcivo/infra/scripts/
```

## 3. Criar o arquivo .env na VPS (NUNCA commitar)

Na VPS:

```bash
cd /opt/orcivo/infra
cat > .env << 'EOF'
POSTGRES_DB=orcivo_prod
POSTGRES_USER=orcivo
POSTGRES_PASSWORD=<senha_forte_aqui>
REDIS_PASSWORD=<senha_redis_aqui>
MINIO_ROOT_USER=orcivo_admin
MINIO_ROOT_PASSWORD=<senha_minio_12chars_aqui>
DOMAIN=seudominio.com.br
NEXT_PUBLIC_API_URL=https://api.seudominio.com.br
NEXT_PUBLIC_WEB_URL=https://app.seudominio.com.br
ACME_EMAIL=seu@email.com
EOF
chmod 600 /opt/orcivo/infra/.env
```

**Salvar as senhas no Bitwarden (ou gerenciador preferido) ANTES de continuar.**

## 4. Preparar diretórios de volumes em /mnt/data

```bash
sudo mkdir -p /mnt/data/{postgres,redis,minio,caddy/data,caddy/config}
sudo chown -R $USER:$USER /mnt/data
sudo mkdir -p /mnt/backups
```

## 5. Subir a stack

```bash
cd /opt/orcivo/infra
docker compose up -d
docker compose ps  # verificar que todos estão Up
```

## 6. Verificar serviços

```bash
# PostgreSQL
docker compose exec postgres psql -U orcivo -d orcivo_prod -c '\l'

# Redis
docker compose exec redis redis-cli -a $REDIS_PASSWORD ping
# Expected: PONG

# MinIO (aguardar ~10s para inicializar)
curl -f http://localhost:9000/minio/health/live && echo "MinIO OK"

# HTTPS (após propagação DNS — pode levar 1-2 min para Let's Encrypt emitir)
curl -I https://storage.seudominio.com.br
# Expected: HTTP/2 200 ou redirect para login do MinIO
```

## 7. Configurar backup automático

```bash
chmod +x /opt/orcivo/infra/scripts/backup-volumes.sh

# Adicionar ao crontab (backup às 2h da manhã)
(crontab -l 2>/dev/null; echo "0 2 * * * POSTGRES_USER=orcivo /opt/orcivo/infra/scripts/backup-volumes.sh") | crontab -
crontab -l  # verificar
```

## Verificação final (checklist STACK-01..09)

```bash
# STACK-01: DNS propagado
dig api.seudominio.com.br +short
dig app.seudominio.com.br +short
dig storage.seudominio.com.br +short

# STACK-02: docker compose ps
docker compose ps | grep -E 'postgres|redis|minio|caddy'
# todos devem mostrar "Up"

# STACK-03: volumes persistentes em /mnt/data
ls -la /mnt/data/

# STACK-04: Caddy subiu sem erros
docker compose logs caddy | tail -20

# STACK-05: PostgreSQL
docker compose exec postgres pg_isready -U orcivo -d orcivo_prod

# STACK-06: Redis
docker compose exec redis redis-cli -a $REDIS_PASSWORD ping

# STACK-07: MinIO
curl -f http://localhost:9000/minio/health/live

# STACK-08: HTTPS
curl -I https://api.seudominio.com.br   # sem erro SSL
curl -I https://app.seudominio.com.br
curl -I https://storage.seudominio.com.br

# STACK-09: Credenciais não no repo
# .env real existe na VPS mas não está no repositório git
ls -la /opt/orcivo/infra/.env       # deve existir na VPS
cd /path/to/local/repo && git status | grep '\.env'  # não deve aparecer
```

## Troubleshooting

**Caddy não emite certificado:**
- Confirmar que DNS propagou: `dig api.seudominio.com.br +short`
- Confirmar que portas 80/443 estão abertas no UFW: `sudo ufw status`
- Ver logs: `docker compose logs -f caddy`

**PostgreSQL não inicia:**
- Checar permissões: `ls -la /mnt/data/postgres`
- Ver logs: `docker compose logs postgres`

**MinIO console inacessível:**
- MinIO precisa de senha com no mínimo 12 caracteres para MINIO_ROOT_PASSWORD
- Ver logs: `docker compose logs minio`
