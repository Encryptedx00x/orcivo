# ADR-016 — Transições de estado explícitas e histórico imutável

**Status:** Accepted
**Data:** 2026-09-01
**Autores:** Dyogo Ortega (owner) · Claude (Decision Agent)
**Relacionado:** ADR-015 (audit trail), `03.1-P04-PLAN.md` (aprovação atômica),
`03.1-DISCOVERY-UAT-2026-09-01.md` (D-4)

## Contexto

Hoje as máquinas de estado de `Quote` e `WorkOrder` só andam para frente e todos
os estados terminais são dead-ends:

```
Quote:      DRAFT → SENT → {APPROVED|REJECTED|CANCELLED|EXPIRED} → []
WorkOrder:  PENDING → IN_PROGRESS → {DONE|CANCELLED} → []
```

Problemas reais levantados no discovery:

- cliente que aprovou e depois desistiu — não há como voltar;
- orçamento cancelado por engano — não há reabertura;
- OS finalizada por engano / precisa de correção operacional pós-fechamento;
- `quote.service.cancel` grava o motivo em `notes`, **sobrescrevendo** as notas
  originais (perda de dado);
- só `approve` grava auditoria — nenhuma outra transição deixa rastro.

O owner **não quer** um `<select>` de status livre. Quer **ações de domínio
explícitas** e histórico que nunca é apagado.

## Decisão

### 1. Transições por ação de domínio (não select livre)

**Quote** — ações: `enviar`, `aprovar` (público), `recusar` (`REJECTED`, motivo
opcional: "cliente recusou" / "perdido"), `cancelar` (motivo obrigatório),
`reabrir`, `expirar` (job).

```
DRAFT     → SENT, CANCELLED
SENT      → APPROVED, REJECTED, CANCELLED, EXPIRED
APPROVED  → CANCELLED            (só se a OS gerada ainda não avançou; @AdminOnly)
REJECTED  → SENT, DRAFT          (reabrir; @AdminOnly)
CANCELLED → SENT, DRAFT          (reabrir; @AdminOnly)
EXPIRED   → SENT, DRAFT          (reabrir; @AdminOnly)
```

**WorkOrder** — ações: `iniciar`, `concluir`, `cancelar` (motivo obrigatório),
`reabrir` (motivo obrigatório), `corrigir` (ajuste operacional pós-encerramento —
não muda status, registra a correção).

```
PENDING     → IN_PROGRESS, CANCELLED
IN_PROGRESS → DONE, CANCELLED
DONE        → IN_PROGRESS        (reabrir; motivo obrigatório; @AdminOnly)
CANCELLED   → PENDING, IN_PROGRESS  (reabrir; motivo obrigatório; @AdminOnly)
```

`corrigir` numa OS `DONE`/`CANCELLED`: permite editar campos operacionais
(datas, valores, itens, fotos) **registrando um `work_order.corrected` no audit**
com o diff dos campos tocados. Não reabre o status.

### 2. Histórico imutável

- **Nenhuma transição apaga dado.** `cancel`/`reject` param de sobrescrever
  `notes`. O motivo vai **só** para o audit trail (ADR-015), nunca por cima de
  campo existente.
- Toda transição chama `AuditService.record({ action, from, to, reason?,
actorType, actorUserId })` **dentro da mesma transação** da mudança de status.
- `assertValidTransition` continua sendo a única porta — as novas arestas são
  adicionadas lá, não num bypass.

### 3. Autorização

- Ações de fluxo normal (`enviar`, `iniciar`, `concluir`): qualquer membro ativo.
- `cancelar`, `reabrir`, `corrigir`, e `aprovar→cancelar`: `@AdminOnly`
  (OWNER/ADMIN). TECNICO não reabre nem corrige encerramento.
- Aprovação pública (`quotes/public/:token`) permanece `@Public` com
  `actor_type: 'PUBLIC'` no audit.

### 4. Integridade da OS gerada na aprovação

- `quote.approve` cria a OS de forma atômica e idempotente (já é escopo de
  P04 + P02-T11). Cancelar um quote `APPROVED` exige que a OS gerada ainda esteja
  `PENDING`; se já avançou, bloqueia com mensagem clara (cancele/reabra a OS
  primeiro).

## Escopo e ordem

- Entra em **03.1-P04 — Aprovação atômica e idempotente**, com o plano expandido
  para cobrir as duas máquinas de estado completas + as ações de correção.
- **MUST HAVE antes do MVP:** `cancelar` e `reabrir` de Quote e OS com motivo +
  fim da sobrescrita de `notes` + audit em toda transição. `corrigir` operacional
  pode ser um incremento logo depois, ainda em P04.
- Novas arestas não exigem migration (os enums de status já existem). Só a coluna
  `actor_user_id` do ADR-015.

## Consequências

**Positivas**

- Fluxos reais de negócio deixam de ser becos sem saída.
- Zero perda de dado em cancelamento/rejeição.
- Toda mudança de estado fica rastreável (casa com ADR-015).
- UI continua com botões explícitos (o web já faz isso na OS — bom) — sem select
  de status livre.

**Negativas / trade-offs**

- Mais arestas na máquina de estado → mais casos de teste (transição válida /
  inválida / autorização por papel / motivo obrigatório / audit gravado).
- `corrigir` numa entidade encerrada é poder perigoso — mitigado por `@AdminOnly`
  - audit obrigatório com diff.
- Reabrir uma OS `DONE` que já tem pagamento conciliado precisa de regra de
  negócio explícita (fica documentado no plano de P04; default: permite, o
  pagamento não é tocado, tudo vai pro audit).

## Não faz parte desta decisão

- Workflow configurável por tenant — as máquinas de estado são fixas no produto.
- Aprovação em múltiplas etapas / alçadas — fora de escopo do MVP.
