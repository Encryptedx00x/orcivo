# Plano de confiabilidade do autopilot

Data: 2026-10-11

## Objetivo

Eliminar pausas silenciosas e falsos estados de execução sem quebrar a
linhagem oficial do dispatcher. O supervisor deve detectar, classificar e
recuperar travamentos por comandos oficiais, mantendo um único scheduler e
sem editar manualmente estado, ledger, checkpoint ou recibos.

## Problemas observados

1. O processo de implementação podia encerrar enquanto estado e lease ainda
   pareciam ativos, deixando a tarefa sem progresso real.
2. O monitor periódico reportava o estado, mas não distinguia processo vivo,
   processo produtivo e checkpoint avançando.
3. Infra de teste indisponível ou lenta virava falha de produto; o E2E de
   storage, por exemplo, usava apenas 5 s para inicialização real.
4. Troca de provedor, recuperação e refile dependiam de intervenção tardia.
5. Tarefas já publicadas podiam continuar `SCHEDULED` no arquivo de origem,
   criando risco de repetição depois de uma reconciliação.
6. Não havia um SLA objetivo de progresso nem uma prova única para dizer que
   um worker estava travado.

## Regras não negociáveis

- Um único scheduler por repositório e `maxParallel=1` até a estabilização.
- Ledger, checkpoint, leases, recibos e candidatos só mudam pelo dispatcher.
- Nenhuma recuperação pode fabricar sucesso, revisão ou failover.
- Publicação exige gates automáticos, commit alcançável e recibo imutável.
- Estado é classificado por exit code e evidência estruturada, não por texto
  isolado em stdout/stderr.
- Provedor e fallback são configuração declarativa do lote; o watchdog apenas
  executa a rota autorizada.

## Entregas

### 1. Autoridade de processo e lease

- Criar `Get-OrcivoPilotRuntimeSnapshot` com PID, comando, raiz resolvida,
  início, CPU, memória, lease, run/task/version/invocation e idade.
- Considerar `RUNNING` válido somente quando processo, lease e checkpoint
  apontarem para a mesma linhagem.
- Recusar segundo scheduler quando houver lease válido; limpar lease órfão
  somente pelo comando oficial de recuperação e com prova de PID inexistente.

Aceite: testes cobrem PID reutilizado, processo de outro repositório, lease
expirado, dois schedulers e reinício do Windows.

### 2. Watchdog de progresso

- Registrar heartbeat estruturado por etapa com `lastProgressAt`, ação atual,
  contadores e hash do checkpoint.
- Definir SLA por etapa: dispatch, implementação, gates, revisão e publicação.
- Após duas janelas sem avanço, coletar diagnóstico; após três, executar uma
  única recuperação oficial idempotente ou transicionar para espera explícita.
- Nunca matar processo apenas por baixo uso de CPU; exigir ausência conjunta de
  progresso, saída, filhos e alteração de recibo/checkpoint.

Aceite: simulação de worker vivo sem progresso termina em recuperação única,
sem duplicar invocation nem chamada de provedor.

### 3. Preflight de infraestrutura

- Antes de despachar tarefa, validar somente dependências do perfil: banco,
  Redis, S3, espaço em disco, memória disponível, Git e autenticação do
  provedor.
- Separar `INFRA_FAILURE`, `PROVIDER_QUOTA`, `RATE_LIMIT`, `TEST_FAILURE` e
  `PRODUCT_FAILURE` por evidência estruturada.
- Permitir retry com backoff para infraestrutura transitória sem gastar ciclo
  de revisão nem criar nova implementação.
- Definir timeouts de integração por perfil; inicialização real não usa o
  limite de testes unitários.

Aceite: serviço ausente bloqueia antes do provider; serviço lento recupera;
falha de asserção continua sendo falha de produto.

### 4. Recuperação e failover oficiais

- Centralizar tabela `failureClass → command → maxAttempts → cooldown`.
- Preservar task/version/run/invocation/candidate em toda retomada.
- Exigir probe estruturado antes de sair de `WAITING_PROVIDER`.
- Tornar refile idempotente e proibido quando o commit já estiver publicado.

Aceite: quota, rate limit, resultado incompleto, worker encerrado e revisão
interrompida têm testes de ponta a ponta sem edição manual de arquivos.

### 5. Reconciliação do lote e publicação

- Reconciliar cada tarefa com ancestry do Git, recibo de publicação e gates.
- Marcar como concluída somente com evidência; impedir repetir commit já
  alcançável em `main`.
- Detectar diff fora do escopo antes dos testes caros.
- Separar “implementado”, “revisado”, “publicado” e “deployado”; nenhum deles
  implica o seguinte.

Aceite: lote pode ser reconstruído após reboot sem perder nem duplicar tarefa.

### 6. Supervisão e observabilidade

- Status curto deve mostrar tarefa, etapa, idade do último progresso, PID,
  lease, provider, tentativa, gates e próximo evento esperado.
- Persistir diagnósticos sanitizados; nunca registrar segredo, prompt integral
  ou variável sensível.
- Alertar somente em transição significativa, conclusão ou ação humana real.
- Medir duração p50/p95 por etapa, retries, tempo parado e causa de falha.

Aceite: em menos de 30 s o supervisor distingue execução saudável, espera
legítima, processo órfão e travamento.

### 7. Limites de recurso

- Medir memória do scheduler, worker e filhos; aplicar orçamento por tarefa.
- Encerrar filhos órfãos somente depois de validar raiz, linhagem e ownership.
- Serializar builds/testes pesados e impedir concorrência com outro projeto.
- Rotacionar artefatos temporários por run, mantendo recibos imutáveis.

Aceite: teste de estresse não duplica worker e mantém o desktop responsivo.

## Plano de testes

- Unitários: classificação, SLA, ownership, backoff e reconciliação.
- Integração: processo real curto, processo travado, exit 0 incompleto, banco
  lento, Redis ausente, S3 lento, quota e rate limit.
- Reinício: matar scheduler, preservar worker; matar worker, preservar
  scheduler; reboot simulado entre cada etapa.
- Caos: PID reutilizado, lease corrompido, checkpoint antigo e rede oscilante.
- Regressão: toda suíte existente de `scripts/orchestration/v2/tests`.

## Ordem de implementação

1. Instrumentação e testes de snapshot, sem alterar recuperação.
2. Autoridade processo/lease e bloqueio de duplicação.
3. Preflight e classificação de infraestrutura.
4. Watchdog com modo somente observação.
5. Recuperação automática habilitada para uma classe por vez.
6. Reconciliação/publicação idempotente.
7. Stress, caos e atualização do runbook operacional.

## Critério de encerramento

- 20 tarefas sintéticas consecutivas, incluindo falhas injetadas, sem pausa
  silenciosa, duplicação, perda de linhagem ou mutação manual.
- Toda espera informa causa, próxima ação e tempo de nova tentativa.
- Uma tarefa já publicada nunca é reimplementada.
- Nenhum segredo ou prompt bruto aparece nos artefatos.
- Reinício do host retoma ou encerra de forma terminal e verificável.
