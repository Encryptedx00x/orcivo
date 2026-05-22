# Orcivo — Arquitetura

> Esboço inicial — detalhar durante a Fase 1

## Stack

| Camada | Tecnologia |
|---|---|
| Backend | NestJS + TypeScript + Prisma |
| Banco | PostgreSQL 16 |
| Cache | Redis 7 + BullMQ |
| Storage | MinIO (S3-compatible) |
| Mobile | React Native + Expo |
| Web | Next.js + Tailwind + shadcn/ui |
| Reverse proxy | Caddy (HTTPS automático) |
| Deploy | Docker Compose + VPS Hostinger |
| CI/CD | GitHub Actions + EAS Build |

## Princípios

- **Multi-tenant por company_id:** toda tabela de negócio tem company_id obrigatório
- **Money como Decimal:** nunca number/float — Prisma.Decimal no backend, string decimal na API, Decimal.js no cliente
- **JWT identifica, Redis autoriza:** JWT stateless para identificação; autorização revalida a cada request com cache 60s
- **Monólito modular:** sem microsserviços até escala justificar
- **Mobile-first:** features priorizadas pelo uso em campo

## Diagrama de alto nível

```
[Mobile Expo] ──────────────────────┐
                                    ▼
[Web Next.js] ─────────── [Caddy HTTPS] ──── [NestJS Backend]
                                                    │
                                          ┌─────────┼──────────┐
                                          ▼         ▼          ▼
                                     [PostgreSQL] [Redis]   [MinIO]
```

## Decisões de design

Ver `docs/decisions/` para os ADRs.
