# AUTONOMY_POLICY — Orcivo

Objetivo: permitir execução com alta autonomia no Claude Code/GSD, chamando o usuário apenas em decisões críticas.

## 1. Princípio geral

O agente executa sozinho quando a decisão:
- está coberta pelo planejamento;
- segue o design aprovado;
- não muda stack;
- não muda domínio de negócio;
- não gera custo novo;
- não expõe segredo;
- não altera estratégia comercial;
- não cria risco de segurança/LGPD;
- é reversível e testável.

O agente para quando a decisão:
- impacta arquitetura, segurança, LGPD, billing, fiscal, multi-tenancy ou money handling;
- gera custo novo;
- foge do design aprovado;
- exige secret/API key;
- exige deploy/publicação/push;
- pode causar perda de dados;
- pode gerar retrabalho alto.

## 2. Níveis de autonomia

### Nível A — executar sozinho

Pode executar sem pedir confirmação:
- criar docs GSD e ADRs previstas;
- criar estrutura de pastas prevista;
- criar boilerplate do monorepo;
- configurar lint/format/test padrão;
- criar componentes base seguindo design;
- corrigir TypeScript/lint/test;
- atualizar imports;
- criar mocks;
- ajustar copy conforme docs;
- pequenos refactors sem mudança de API;
- adicionar testes de comportamento já definido.

### Nível B — consultar GPT Decision Agent

Consultar GPT, sem necessariamente chamar o usuário:
- escolha entre duas libs equivalentes;
- pequena mudança de estrutura de pasta;
- dúvida de implementação entre 2 caminhos;
- conflito leve entre docs;
- decisão de UI dentro do design;
- falha de teste com múltiplas correções;
- dúvida sobre ordem de tasks;
- ajuste GSD sem alterar escopo.

### Nível C — pedir aprovação do usuário

Parar e pedir aprovação:
- mudar stack, banco, auth, plano comercial, design system;
- adicionar dependência paga;
- ativar serviço externo pago;
- publicar app/web/API;
- configurar domínio real/DNS;
- mexer em secrets;
- alterar LGPD/retenção;
- alterar multi-tenant strategy;
- alterar money handling;
- alterar billing/fiscal;
- remover teste obrigatório;
- executar comando destrutivo;
- `git push --force` / `--force-with-lease` / `git reset --hard` / `git clean -fd`;
- deletar branch remota;
- reescrever histórico;
- tornar repositório público;
- alterar GitHub Secrets;
- deploy produção / DNS / VPS / SSH / firewall.

## 3. Escopo por fase

### Fase 0 pode executar

- monorepo;
- apps hello world;
- docker-compose local;
- PostgreSQL/Redis/MinIO local;
- docs/ADRs;
- design tokens;
- CI básico;
- scripts de dev.

### Fase 0 não pode executar

- clientes reais;
- orçamentos;
- OS;
- financeiro;
- billing;
- fiscal;
- estoque;
- deploy produção;
- Play Store/App Store.

## 4. Regras de design

Seguir:
- /docs/FRONTEND_DESIGN_MASTER.md
- /docs/OPERATIONS_UI_MISSING_SPECS.md
- /docs/design-handoff/orcivo-design-system/

Obrigatório:
- Orcivo;
- white / black / purple;
- primary --purple-600 #6D28D9;
- Inter no web;
- Lucide;
- pt-BR;
- visual limpo, profissional, sem cara de ERP pesado.

Proibido:
- recriar design system;
- trocar paleta;
- trocar fonte;
- usar FREE/POP/PRO/TOP como nomes visíveis;
- usar "ilimitado";
- usar "14 dias";
- usar "Assinar PRO";
- inventar nova marca.

Planos visíveis:
- Orcivo Livre
- Orcivo Solo
- Orcivo Mais
- Orcivo Equipe

## 5. Regras de Git e GitHub

**Repositório privado — apenas desenvolvimento/testes.**

### Permitido automaticamente

- `git status`, `git diff`, `git add`, `git commit`
- `git push` para `main`/`master`
- `git push` para branches GSD (`gsd/phase-*`, `gsd/fix-*`, etc.)
- commits pequenos durante execução de planos GSD
- push após cada plano/deliverable concluído
- push após correções de lint/typecheck/test

### Pré-condições obrigatórias antes de push

1. Diff não contém secrets, tokens ou API keys
2. Diff não contém "Generated with Claude" nem "Co-authored-by Claude"
3. Diff não contém prompts, transcripts ou logs de IA
4. Validações disponíveis rodadas quando aplicável (lint/typecheck/test)

### Proibido sem aprovação explícita

- `git push --force` / `--force-with-lease`
- `git reset --hard` / `git clean -fd`
- Deletar branch remota
- Reescrever histórico
- Tornar repositório público
- Alterar GitHub Secrets ou configurar Actions com secrets reais
- Deploy produção / DNS / VPS / SSH / firewall

## 6. Regras de autoria e commits

Proibido inserir em código, commit, README ou comentários:
- Generated with Claude
- Co-authored-by Claude
- AI-generated
- created by AI
- prompt/transcript/log de IA

Commits devem ser humanos, objetivos e técnicos.

Exemplos:
- chore: initialize monorepo
- docs: add initial ADRs
- infra: add local docker compose
- feat: add backend health endpoint
- feat: add web app shell
- feat: add mobile app shell
- test: add initial health checks

Antes de commit:
- git status
- git diff
- buscar termos proibidos
- rodar lint/typecheck/test quando existir

## 7. Quando consultar GPT

Consultar GPT quando:
- houver dúvida técnica moderada;
- a decisão estiver entre Nível B e C;
- GSD solicitar escolha repetidamente;
- houver conflito entre docs;
- Claude estiver inseguro;
- uma alternativa puder gerar retrabalho;
- antes de mudar plano da fase.

Formato obrigatório da pergunta:

```text
Contexto:
[resumo]

Fase:
[Fase 0/Fase 1/etc]

Decisão necessária:
[pergunta objetiva]

Opções:
A) ...
B) ...
C) ...

Critérios:
- manter stack travada;
- seguir design;
- evitar custo;
- evitar retrabalho;
- manter segurança;
- preservar multi-tenancy.

Resposta esperada:
- decisão recomendada;
- justificativa;
- risco;
- próximos passos.
```

## 8. Quando chamar o usuário mesmo após GPT

Pedir aprovação do usuário quando envolver:
- dinheiro/custo novo;
- deploy externo;
- publicação;
- DNS/domínio;
- billing/fiscal;
- LGPD/retenção;
- mudança visual grande;
- mudança de stack;
- remoção de feature planejada;
- perda de dados;
- decisão irreversível.

## 9. Regra final

Se for reversível, local, barato, alinhado aos docs e testável: execute.

Se for estratégico, caro, externo, sensível ou irreversível: pare e peça aprovação.
