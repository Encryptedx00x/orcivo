# DECISION_MATRIX — Orcivo

Matriz prática para decidir se o agente executa sozinho, decide autonomamente
com base em pesquisa/evidência, ou chama o usuário.

**O Claude é o próprio agente decisor para Nível B.** Não há gate externo
obrigatório. `tools/decision-consultant/consult-gpt.mjs` continua disponível
como segunda opinião opcional (ver `docs/GPT_DECISION_BRIDGE.md`), nunca como
requisito para prosseguir.

## Tabela de decisão

| Situação                                                          | Ação              |
| ----------------------------------------------------------------- | ----------------- |
| Criar pasta/boilerplate previsto no PLAN.md                       | Executar (A)      |
| Ajustar lint/typecheck/test                                       | Executar (A)      |
| Corrigir teste quebrado sem mudar regra                           | Executar (A)      |
| Criar componente seguindo design                                  | Executar (A)      |
| git status / diff / add / commit                                  | Executar (A)      |
| git push para main ou gsd/\* (repo privado, pré-checks ok)        | Executar (A)      |
| Criar plano/checkpoint/summary GSD                                | Executar (A)      |
| Criar docs/ADRs previstos                                         | Executar (A)      |
| Correção óbvia de UAT (1 linha, causa clara)                      | Executar (A)      |
| Research first quando a fase introduz arquitetura nova            | Executar (A)      |
| Skip research quando a fase é CRUD repetitivo                     | Executar (A)      |
| Migration em DB efêmero, Docker local, CI                         | Executar (A)      |
| Dúvida entre bibliotecas gratuitas equivalentes                   | Claude decide (B) |
| Conflito leve entre docs                                          | Claude decide (B) |
| Dúvida de implementação interna (2 caminhos válidos)              | Claude decide (B) |
| Erro com mais de uma correção possível                            | Claude decide (B) |
| Ordem de execução de tasks ou planos não óbvia                    | Claude decide (B) |
| Decisão de arquitetura interna (sem mudar stack)                  | Claude decide (B) |
| Decisão de modelagem de dados (sem mudar estratégia multi-tenant) | Claude decide (B) |
| Discuss-phase vs plan direto para fase grande                     | Claude decide (B) |
| Dúvida se deve pesquisar antes de planejar                        | Claude decide (B) |
| Interpretação de requisito técnico ambíguo                        | Claude decide (B) |
| Mudança de stack                                                  | Usuário (C)       |
| Serviço pago novo                                                 | Usuário (C)       |
| Publicação/deploy externo                                         | Usuário (C)       |
| Segredo/API key fornecida externamente                            | Usuário (C)       |
| Billing/fiscal                                                    | Usuário (C)       |
| LGPD/retenção de dados                                            | Usuário (C)       |
| Multi-tenancy (mudança deliberada de estratégia)                  | Usuário (C)       |
| Money handling (mudar estratégia)                                 | Usuário (C)       |
| Design system (mudar identidade visual)                           | Usuário (C)       |
| Decisão visual subjetiva sem validação por teste/screenshot       | Usuário (C)       |
| Decisão que altera explicitamente um requisito de negócio         | Usuário (C)       |
| Perda de dados (drop, migration destrutiva)                       | Usuário (C)       |
| git push --force / reset --hard / clean -fd                       | Usuário (C)       |
| Deletar branch remota / apagar recursos remotos                   | Usuário (C)       |
| Tornar repo público                                               | Usuário (C)       |
| Alterar GitHub Secrets                                            | Usuário (C)       |

## Fluxo Nível B — Claude decide autonomamente

```text
1. Pesquisar quando necessário (código existente, docs oficiais, Graphify,
   skills instaladas).
2. Formar evidência: o que a stack/design/planejamento já resolvem, o que
   está genuinamente em aberto.
3. Decidir a opção mais simples e robusta que atenda aos critérios do
   projeto (stack travada, seguir design, evitar custo, evitar retrabalho,
   preservar multi-tenancy).
4. Registrar a decisão (ADR ou nota no plano/summary) quando ela for
   arquiteturalmente relevante — não é preciso registrar toda micro-decisão.
5. Executar sem pedir aprovação humana.
```

`tools/decision-consultant/consult-gpt.mjs` pode ser usado como segunda opinião
pontual (ex.: quando a evidência interna ficar genuinamente insuficiente e o
usuário não estiver disponível), mas seu resultado é consultivo — a decisão e
a responsabilidade continuam sendo do Claude, e rodá-lo nunca é um passo
obrigatório antes de executar.

## Perguntas antes de parar o usuário

1. Essa decisão já está resolvida nos docs?
2. É reversível?
3. Tem custo?
4. Afeta segurança, dados de produção ou billing?
5. É Nível C pela lista acima (stack, secrets, produção, billing, LGPD,
   estratégia comercial/multi-tenant/money, operação destrutiva, requisito de
   negócio, julgamento visual subjetivo)?

Se a resposta a 5 for não, é Nível A ou B — decida e execute.

## Exemplos

### Porta local do backend

Decisão: **executar sozinho (A)**
Motivo: reversível, local, sem impacto.

### Discuss-phase vs plan direto para Fase 2 (grande)

Decisão: **Claude decide (B)**
Motivo: escolha de estratégia de planejamento — pesquisar o escopo da fase,
decidir, registrar no CONTEXT.md se relevante, seguir sem perguntar.

### Prisma vs Drizzle

Decisão: **usuário (C)**
Motivo: muda stack travada.

### Lib de máscara CPF/CNPJ (gratuita)

Decisão: **Claude decide (B)** — comparar as opções compatíveis com a stack e
escolher a mais simples/robusta.

### Trocar auth próprio por Supabase

Decisão: **usuário (C)**
Motivo: muda estratégia de auth.

## Registro de decisão (quando relevante)

Para decisões B com impacto arquitetural real (não para toda escolha
trivial), registrar em uma ADR nova sob `docs/decisions/` ou como nota no
`SUMMARY.md`/`CONTEXT.md` do plano corrente:

```markdown
Decisão: [o que foi decidido]
Motivo: [por que, com base em quê]
Alternativas consideradas: [se houver]
Reversível: [sim/não]
```
