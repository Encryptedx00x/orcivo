# Runbook — Configurar Asaas em produção

## Pré-requisitos

- Conta Asaas criada em https://asaas.com
- CNPJ da empresa registrado no Asaas
- VPS provisionada (ver `vps-setup.md`)

## Variáveis de ambiente

Adicionar ao `.env` do servidor (**nunca comitar**):

```
ASAAS_API_KEY=seu_token_aqui
ASAAS_ENV=production
ASAAS_WEBHOOK_TOKEN=token_aleatorio_seguro
```

Gerar `ASAAS_WEBHOOK_TOKEN` com:
```bash
openssl rand -hex 32
```

## Configurar webhook no painel Asaas

1. Acessar **Configurações → Integrações → Webhooks**
2. URL: `https://api.orcivo.com.br/webhooks/asaas`
3. Token: valor de `ASAAS_WEBHOOK_TOKEN`
4. Eventos a ativar:
   - `PAYMENT_CONFIRMED`
   - `PAYMENT_OVERDUE`
   - `SUBSCRIPTION_CANCELLED`

## Testar webhook

```bash
curl -X POST https://api.orcivo.com.br/webhooks/asaas \
  -H "asaas-access-token: $ASAAS_WEBHOOK_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "event": "PAYMENT_CONFIRMED",
    "payment": {
      "id": "test_001",
      "customer": "cus_test",
      "status": "CONFIRMED",
      "value": 79.90,
      "dueDate": "2026-06-01"
    }
  }'
# Esperado: {"received":true}
```

## Sandbox

Para testar em sandbox antes do go-live:

```
ASAAS_ENV=sandbox
ASAAS_API_KEY=token_sandbox
```

Conta sandbox: https://homologacao.asaas.com — criar conta separada.

## Deploy em produção

```bash
# 1. Setar variáveis no servidor
ssh deploy@api.orcivo.com.br
echo "ASAAS_API_KEY=..." >> /opt/orcivo/.env
echo "ASAAS_WEBHOOK_TOKEN=..." >> /opt/orcivo/.env

# 2. Rodar migration
docker compose exec backend npx prisma migrate deploy

# 3. Sedar planos
docker compose exec backend npx ts-node prisma/seed.ts

# 4. Reiniciar backend
docker compose restart backend
```

## Verificação pós-deploy

```bash
# Health check
curl https://api.orcivo.com.br/health
# → {"status":"ok"}

# Limites de plano (requer login)
curl -H "Authorization: Bearer $TOKEN" https://api.orcivo.com.br/me/plan-limits
# → {"plan_code":"LIVRE","customers_max":5,...}
```
