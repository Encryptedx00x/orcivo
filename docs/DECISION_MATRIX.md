# DECISION_MATRIX — Orcivo

Matriz prática para decidir se o agente executa, consulta GPT ou chama o usuário.

## Tabela de decisão

| Situação | Ação |
|---|---|
| Criar pasta/boilerplate previsto no PLAN.md | Executar (A) |
| Ajustar lint/typecheck/test | Executar (A) |
| Corrigir teste quebrado sem mudar regra | Executar (A) |
| Criar componente seguindo design | Executar (A) |
| git status / diff / add / commit | Executar (A) |
| git push para main ou gsd/* (repo privado, pré-checks ok) | Executar (A) |
| Criar plano/checkpoint/summary GSD | Executar (A) |
| Criar docs/ADRs previstos | Executar (A) |
| Correção óbvia de UAT (1 linha, causa clara) | Executar (A) |
| Research first quando a fase introduz arquitetura nova | Executar (A) |
| Skip research quando a fase é CRUD repetitivo | Executar (A) |
| Dúvida entre bibliotecas gratuitas equivalentes | GPT obrigatório (B) |
| Conflito leve entre docs | GPT obrigatório (B) |
| Dúvida de implementação interna (2 caminhos válidos) | GPT obrigatório (B) |
| Erro com mais de uma correção possível | GPT obrigatório (B) |
| Ordem de execução de tasks ou planos não óbvia | GPT obrigatório (B) |
| Decisão de arquitetura interna (sem mudar stack) | GPT obrigatório (B) |
| Discuss-phase vs plan direto para fase grande | GPT obrigatório (B) |
| Dúvida se deve pesquisar antes de planejar | GPT obrigatório (B) |
| Mudança de stack | Usuário (C) |
| Serviço pago novo | Usuário (C) |
| Publicação/deploy externo | Usuário (C) |
| Segredo/API key | Usuário (C) |
| Billing/fiscal | Usuário (C) |
| LGPD/retenção de dados | Usuário (C) |
| Multi-tenancy (mudar estratégia) | Usuário (C) |
| Money handling (mudar estratégia) | Usuário (C) |
| Design system (mudar identidade visual) | Usuário (C) |
| Perda de dados (drop, migration destrutiva) | Usuário (C) |
| git push --force / reset --hard / clean -fd | Usuário (C) |
| Deletar branch remota | Usuário (C) |
| Tornar repo público | Usuário (C) |
| Alterar GitHub Secrets | Usuário (C) |

## Fluxo Nível B — GPT obrigatório

```bash
# 1. Criar pergunta
cat > .decision/QUESTION.md << 'EOF'
Contexto: [resumo da situação]
Fase: [Fase N]
Decisão necessária: [pergunta objetiva]
Opções:
A) ...
B) ...
Critérios: manter stack, evitar custo, evitar retrabalho, seguir design
EOF

# 2. Consultar GPT
node tools/decision-consultant/consult-gpt.mjs .decision/QUESTION.md

# 3. Ler resultado
# requires_user=false → executar recomendação
# requires_user=true  → escalar para usuário (Nível C)
```

## Perguntas antes de parar o usuário

1. Essa decisão já está resolvida nos docs?
2. É reversível?
3. Tem custo?
4. Afeta segurança, dados de produção ou billing?
5. Pode ser consultada com GPT antes?

## Exemplos

### Porta local do backend
Decisão: **executar sozinho (A)**
Motivo: reversível, local, sem impacto.

### Discuss-phase vs plan direto para Fase 2 (grande)
Decisão: **GPT obrigatório (B)**
Motivo: escolha de estratégia de planejamento — GPT decide, sem chamar usuário.

### Prisma vs Drizzle
Decisão: **usuário (C)**
Motivo: muda stack travada.

### Lib de máscara CPF/CNPJ (gratuita)
Decisão: **GPT (B)** se houver dúvida entre 2 opções; **executar (A)** se só houver uma opção óbvia.

### Trocar auth próprio por Supabase
Decisão: **usuário (C)**
Motivo: muda estratégia de auth.

## Saída esperada do GPT Decision Agent

```json
{
  "decision": "A",
  "confidence": "high",
  "requires_user": false,
  "summary": "Usar discuss-phase antes de planejar fase grande",
  "why": ["fase grande com múltiplos domínios novos", "discuss captura decisões que evitam retrabalho"],
  "risks": ["adiciona ~30min de discuss antes da execução"],
  "next_steps": ["/gsd-discuss-phase 2"]
}
```
