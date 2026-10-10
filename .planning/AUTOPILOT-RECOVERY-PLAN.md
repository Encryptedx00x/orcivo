# Plano de correção do autopilot após o lote 3

## Objetivo

Fazer o piloto progredir ou declarar bloqueio verificável, sem criar segunda
linhagem, sem editar ledger/checkpoint manualmente e sem ficar horas parado
com processo, lease ou provedor inativo.

## Problemas observados

1. Processo do piloto pode morrer ou ficar preso sem um sinal único de saúde.
2. Lease e processo do sistema operacional podem divergir.
3. `WAITING_PROVIDER` não evidencia de forma suficiente a troca oficial de
   rota nem dá prazo para nova prova.
4. Gates e revisões podem ficar aguardando uma ação já autorizada.
5. Testes dependentes de PostgreSQL/Redis/S3 locais falham tardiamente, depois
   de consumir uma tentativa de agente.
6. O status atual não resume causa, próxima ação, deadline e evidência numa
   única leitura curta.

## Entrega 1 — contrato de saúde do piloto

- Acrescentar ao `pilot.ps1 status` um objeto `health` com `process`, `lease`,
  `heartbeatAt`, `currentTask`, `state`, `nextActionAt` e `reasonCode`.
- Definir estados exclusivos: `RUNNING`, `WAITING_PROVIDER`, `WAITING_GATE`,
  `WAITING_INFRA`, `FAILED_RETRYABLE`, `FAILED_TERMINAL`, `COMPLETE`.
- Um `RUNNING` sem heartbeat dentro do limite vira `FAILED_RETRYABLE` pela
  transição oficial; nunca por edição do JSON.
- Testes: processo vivo/lease vencido, processo morto/lease válido e ambos
  saudáveis.

## Entrega 2 — supervisor watchdog idempotente

- Criar um comando oficial de supervisão, por exemplo `pilot.ps1 supervise`,
  que só lê status, valida processo/lease e usa os comandos de recuperação
  existentes.
- Antes de relançar, confirmar que não existe processo ativo para o mesmo
  `runId`; adquirir lease oficial; gravar recibo de tentativa.
- Limitar a uma execução concorrente e aplicar backoff exponencial com jitter.
- Não usar `Start-Process` direto fora do lifecycle nem reconstruir candidato.
- Testes: duas chamadas simultâneas produzem uma única execução; processo
  morto é retomado uma vez; processo saudável não é duplicado.

## Entrega 3 — pré-flight de infraestrutura

- Antes de despachar uma task, testar as dependências declaradas por ela:
  PostgreSQL, Redis e S3 quando o comando de aceite precisar delas.
- Produzir recibo sanitizado por porta/serviço, sem imprimir URL, senha ou
  token; classificar `WAITING_INFRA` com instrução objetiva.
- Não consumir orçamento de implementador/revisor quando a infraestrutura
  obrigatória estiver indisponível.
- Testes: porta recusada, credencial inválida, serviço saudável e task sem
  dependência de infraestrutura.

## Entrega 4 — failover de provedor comprovável

- Manter o mesmo modelo lógico em rotas configuradas e registrar cada sonda
  estruturada (provedor, modelo, motivo sanitizado, hora, resultado).
- Só promover Z.AI → NIM/Codex após `PROVIDER_QUOTA` ou `RATE_LIMIT`
  reconhecido; nenhuma troca por texto livre de log.
- Após duas falhas recuperáveis, entrar em espera com `nextActionAt`, e não em
  loop apertado.
- Testes do dispatcher para quota, rate limit, erro não elegível e sucesso na
  rota reserva.

## Entrega 5 — gates e revisão sem espera humana indevida

- Expor no status o nome do gate, `taskVersion`, autorização exigida e comando
  oficial aplicável.
- Ter allowlist versionada de gates previamente autorizados, assinada por
  decisão do dono; usar somente `approve-gate` para avançar.
- Autorrevisão em sessão nova deve gerar recibo com checklist de escopo,
  Decimal, tenant, migration, segredos e superfícies.
- `FAILED_REVIEW_BUDGET` cria uma tarefa de correção/revisão curta, não repete
  a mesma chamada indefinidamente.

## Entrega 6 — observabilidade e operação

- Checkpoint append-only por transição: estado anterior/posterior, comando
  oficial, hash de tarefa, `runId`, duração e motivo sanitizado.
- `status --summary` em até cinco linhas: rodada/tarefa, progresso, saúde,
  próxima ação e bloqueio, se houver.
- Métricas locais: duração por fase, retries, falhas de infra, falhas de
  provedor, gates e tasks concluídas.
- Alertar somente por mudança significativa, deadline vencido ou conclusão.

## Ordem segura de implementação

1. Testes de regressão do dispatcher/pilot para o estado atual.
2. Contrato de saúde e `status --summary`.
3. Pré-flight de infraestrutura.
4. Watchdog idempotente.
5. Failover e gates.
6. Métricas/recibos e teste de falha simulada ponta a ponta.

## Critérios de aceite

- Uma task não fica sem heartbeat além do timeout configurado.
- Nenhuma retomada duplica processo, candidato ou publicação.
- Infra indisponível bloqueia antes de gastar chamada de modelo.
- A troca de provedor é rastreável e preserva modelo/linhagem.
- Gates autorizados avançam por comando oficial e com recibo.
- Um teste de queda de processo, uma cota esgotada e um Redis desligado são
  recuperados ou classificados em menos de um ciclo de supervisão.
- Não há edição manual de ledger, checkpoint, candidate ou histórico Git.
