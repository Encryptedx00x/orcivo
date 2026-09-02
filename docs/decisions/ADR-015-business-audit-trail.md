# ADR-015 — Trilha de auditoria de negócio

**Status:** Accepted
**Data:** 2026-09-01
**Autores:** Dyogo Ortega (owner) · Claude (Decision Agent)
**Relacionado:** ADR-011 (multi-tenant), ADR-016 (transições de estado),
`03.1-DISCOVERY-UAT-2026-09-01.md` (D-5)

## Contexto

Discovery de produto (2026-09-01) mostrou que o `AuditLog` existe no schema mas é
escrito em **um único ponto** (`quote.service.approve` → `quote.approved`,
`actor_type: 'SYSTEM'`). Não há registro para orçamento enviado/cancelado/
recusado/expirado, mudança de status de OS, criação/baixa de pagamento, convites,
mudança de papel de membro, alteração de dados da empresa nem de métodos de
aprovação. Não há endpoint de leitura nem UI — as abas "Histórico" no web são
placeholders.

O owner precisa de uma trilha **de negócio** ("o que aconteceu com este
orçamento / esta OS / este pagamento e quem fez") — distinta dos logs técnicos
do Nest (que continuam sendo só observabilidade de runtime).

## Decisão

1. **Modelo.** Estender `AuditLog` (migration aditiva):
   - `actor_user_id String?` (FK opcional para `User`; nulo quando
     `actor_type != 'USER'`).
   - `metadata Json?` passa a seguir um shape padronizado para transições:
     `{ from, to, reason?, ... }`.
   - `actor_type`: `USER` | `SYSTEM` | `PUBLIC` (aprovação via link público).
   - Mantém `company_id` (loose, sem relation forte — igual hoje) e os índices
     `[company_id]` e `[company_id, entity_type, entity_id]`.

2. **Serviço central.** `AuditService.record({ companyId, actorType,
actorUserId?, action, entityType, entityId, from?, to?, reason?, metadata? },
tx? )` — aceita um `Prisma.TransactionClient` opcional para gravar **dentro da
   mesma transação** da mutação que está auditando (crítico para aprovação de
   orçamento e transições de estado).

3. **Cobertura mínima (MVP).** Chamar `AuditService.record` em:
   - **Quote:** `sent`, `approved`, `rejected`, `cancelled`, `expired`,
     `reopened`, `updated` (mudança de itens/valores após envio).
   - **WorkOrder:** todas as transições de status + `reopened` + `corrected`.
   - **Payment:** `created`, `settled`, `deleted`.
   - **Company:** `profile.updated`, `pix_key.updated`, `approval_methods.updated`.
   - **Membership/Invite:** `invite.created`, `invite.revoked`,
     `member.role_changed`, `member.deactivated`.

4. **Leitura.** `GET /audit-logs?entity_type=&entity_id=` (`@AdminOnly`,
   tenant-scoped, paginado, ordenado desc por `created_at`). Sem endpoint de
   escrita — auditoria só é gravada pelos serviços de domínio.

5. **UI.** Aba/bloco "Histórico" real no web para cliente, orçamento e OS,
   consumindo o endpoint. Renderização legível (ação + ator + quando + motivo).

## Escopo e ordem

- Entra como wave nova **03.1-P07.5 — Trilha de auditoria de negócio**, entre P07
  e P08. A migration `actor_user_id` é aditiva e segue o guard de DB efêmero;
  aplicação em banco persistente é gate humano (junto do lote de P02/P03).
- Subset MVP (quote + OS + payment) é **MUST HAVE** antes do MVP monetizável.
  Endpoint de leitura + UI "Histórico" completa podem ser finalizados em P07.5;
  se faltar tempo, a gravação (write path) é o que não pode faltar.

## Consequências

**Positivas**

- Rastreabilidade de negócio real; base para suporte, disputa e conformidade
  futura (LGPD art. 37 — registro de operações).
- `AuditService` único evita lógica de auditoria espalhada e inconsistente.
- Gravação transacional garante que auditoria e efeito não divergem.

**Negativas / trade-offs**

- Toda mutação relevante passa a ter uma escrita extra (custo pequeno; mesma tx).
- `metadata` como `Json` livre exige disciplina de shape (mitigado por tipos em
  `shared-types`).
- `AuditLog` cresce indefinidamente — retenção/particionamento fica como
  problema pós-MVP (volume esperado é baixo por tenant).

## Não faz parte desta decisão

- Logs técnicos / APM / tracing (seguem no Nest logger).
- Event sourcing ou CQRS — `AuditLog` é trilha append-only para leitura humana,
  não fonte de verdade do estado.
- Diff campo-a-campo genérico de entidades — só os campos relevantes vão em
  `metadata`.
