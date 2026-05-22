# ADR-009 — Deploy via Docker Compose em VPS (Hostinger KVM1)

**Status:** Accepted
**Data:** 2026-05-21
**Autores:** Dyogo Holanda

## Contexto

Para 0-50 tenants ativos, serverless (Vercel/Railway) seria desproporcionalmente caro comparado a uma VPS dedicada. Kubernetes seria overhead operacional excessivo para o estágio inicial. A simplicidade operacional é prioritária.

## Decisão

Hostinger KVM1 como VPS inicial (4 vCPU, 8GB RAM). Docker Compose para orquestrar todos os serviços (backend, postgres, redis, minio, caddy). Caddy como reverse proxy com HTTPS automático via Let's Encrypt. Upgrade para KVM2 quando necessário.

## Consequências

**Positivas:**
- Custo fixo e previsível (~R$60-80/mês)
- Docker Compose é simples de operar e fazer rollback
- Caddy elimina configuração manual de SSL/TLS
- Todos os dados ficam em um único local — backup simplificado

**Negativas / trade-offs:**
- Sem auto-scaling — pico de uso pode saturar recursos
- Single point of failure — sem alta disponibilidade nativa
- Downtime durante deploy (blue/green precisa de configuração adicional)
- Upgrade de VPS requer migração manual de dados ou momento de indisponibilidade
