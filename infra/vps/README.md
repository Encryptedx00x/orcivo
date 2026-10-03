# VPS do Orcivo

## Variáveis de ambiente do Mercado Pago

Adicione as variáveis abaixo em `/srv/orcivo/.env` antes de iniciar ou atualizar os serviços de billing:

```dotenv
# Use `test` no ambiente de teste e `production` somente em produção.
MP_ENV=
MP_ACCESS_TOKEN=
MP_PUBLIC_KEY=
MP_WEBHOOK_SECRET=
```

Os valores de produção para `MP_ACCESS_TOKEN`, `MP_PUBLIC_KEY` e `MP_WEBHOOK_SECRET` são uma decisão Level C: devem ser enviados pelo owner e nunca registrados neste repositório.

Mantenha o arquivo `/srv/orcivo/.env` fora do controle de versão e use as credenciais de teste enquanto `MP_ENV=test`.

## Backup diário do Postgres

`backup-db.sh` gera `orcivo-<db>-<timestamp UTC>.sql.gz` (pg_dump via `docker exec orcivo-db`, usando o `POSTGRES_USER`/`POSTGRES_DB` do próprio container), valida o gzip, confere que o dump não está truncado e só então apaga backups com mais de `RETENTION_DAYS` dias. Se o dump falhar, nada é apagado.

| Variável         | Padrão                | Descrição                                                           |
| ---------------- | --------------------- | ------------------------------------------------------------------- |
| `BACKUP_DIR`     | `/srv/orcivo/backups` | Destino dos dumps (criado com permissão 700/arquivos 600).          |
| `RETENTION_DAYS` | `14`                  | Dias de retenção.                                                   |
| `DB_CONTAINER`   | `orcivo-db`           | Container do Postgres. Vazio = modo host (usa `PG*` e `pg_dump`).   |
| `DOCKER`         | `docker`              | Comando docker, ex.: `sudo docker`.                                 |

### Cron (a configurar na VPS — não aplicado por esta task)

```cron
# crontab -e (usuário com acesso ao docker). Todo dia às 03:15.
15 3 * * * DOCKER="sudo docker" /srv/orcivo/source/infra/vps/backup-db.sh >> /srv/orcivo/backup.log 2>&1
```

Os backups ficam no mesmo disco da VPS; para proteção real contra perda do servidor, copie `BACKUP_DIR` para fora (ex.: bucket/rsync) — decisão do owner.

### Restore

```sh
gzip -dc orcivo-<db>-<timestamp>.sql.gz | docker exec -i orcivo-db sh -c 'psql -U "$POSTGRES_USER" -d "<db_vazio>" -v ON_ERROR_STOP=1'
```

Restaure sempre primeiro em um banco vazio/temporário e confira os dados antes de substituir produção.

### Teste local

`bash infra/vps/test-backup-db.sh` sobe um Postgres descartável (`postgres:16-alpine`), executa o backup, verifica rotação, restaura em outro banco e compara os dados. Não toca em `orcivo-db` nem em qualquer banco real.

## Redirect www → sem-www

`Caddyfile.orcivo` contém o bloco `www.orcivo.com.br` com `redir https://orcivo.com.br{uri} permanent`. Para funcionar na VPS:

1. Criar o registro DNS `www` (A, `54.38.241.158`) — sem ele o Caddy não obtém certificado para `www`.
2. O `activate-proxy.sh` só anexa o snippet ao `/srv/stack/Caddyfile` se ainda não existir `# --- Orcivo`; em uma VPS já ativada é preciso atualizar o bloco manualmente (ou substituir entre `# --- Orcivo` e `# --- /Orcivo ---`), validar e recarregar o Caddy. `www` propositalmente **não** está em `HOSTS` do script para não bloquear a ativação enquanto o DNS não existir.

## Webhook do Mercado Pago — o que falta cadastrar

O backend expõe `POST /webhooks/mercadopago` (público, validado por assinatura `x-signature` + `MP_WEBHOOK_SECRET`). Em produção a URL é:

```
https://api.orcivo.com.br/webhooks/mercadopago
```

**Caddy:** nada além do padrão. O bloco `api.orcivo.com.br` já encaminha qualquer path ao `orcivo-backend:3000`; o webhook é server-to-server, então não precisa de CORS, e o Caddy repassa `x-signature`, `x-request-id` e a query `data.id` sem alterações (não use `redir`/`rewrite` nesse path, pois alteraria o que a assinatura cobre).

**Painel Mercado Pago (owner, Level C):**

1. Em *Suas integrações → (aplicação) → Webhooks*, cadastrar a URL acima no modo de produção (e a equivalente de teste com `MP_ENV=test`) e marcar os eventos de pagamento/assinatura usados pelo billing.
2. Copiar a *assinatura secreta* gerada pelo painel para `MP_WEBHOOK_SECRET` em `/srv/orcivo/.env`, junto com `MP_ACCESS_TOKEN`, `MP_PUBLIC_KEY` e `MP_ENV`.
3. **Atenção:** o `docker-compose.yml` atual **não repassa** as variáveis `MP_*` ao serviço `backend` (só existem no `.env`). Antes de usar o webhook em produção é preciso adicioná-las ao `environment` do `backend` (`MP_ENV`, `MP_ACCESS_TOKEN`, `MP_PUBLIC_KEY`, `MP_WEBHOOK_SECRET`) e recriar o container; sem `MP_WEBHOOK_SECRET` toda notificação será rejeitada com 401.
4. Usar o simulador de notificações do painel para validar o 200 após o deploy.
