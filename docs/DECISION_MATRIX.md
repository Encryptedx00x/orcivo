# DECISION_MATRIX — Orcivo

Matriz prática para decidir se o agente executa, consulta GPT ou chama o usuário.

| Situação | Ação |
|---|---|
| Criar pasta/boilerplate previsto | Executar |
| Ajustar lint/typecheck | Executar |
| Corrigir teste quebrado sem mudar regra | Executar |
| Criar componente seguindo design | Executar |
| Dúvida entre bibliotecas equivalentes | Consultar GPT |
| Conflito leve entre docs | Consultar GPT |
| Mudança de stack | Usuário |
| Serviço pago novo | Usuário |
| Publicação/deploy externo | Usuário |
| Segredo/API key | Usuário |
| Billing/fiscal | Usuário |
| Multi-tenancy | Usuário se mudar estratégia |
| Money handling | Usuário se mudar estratégia |
| Design system | Usuário se mudar identidade |
| git status / diff / add / commit | Executar |
| git push para main ou gsd/* (repo privado) | Executar (após checar: sem secrets, sem traces de IA, validações ok) |
| git push --force / reset --hard / clean -fd | Usuário |
| Deletar branch remota | Usuário |
| Tornar repo público | Usuário |
| Alterar GitHub Secrets | Usuário |

## Perguntas antes de parar o usuário

1. Essa decisão já está resolvida nos docs?
2. É reversível?
3. Tem custo?
4. Afeta segurança?
5. Afeta dados de cliente?
6. Afeta billing/fiscal?
7. Afeta arquitetura?
8. Afeta identidade visual?
9. Pode ser validada por teste?
10. Posso consultar GPT antes?

## Exemplos

### Porta local do backend

Decisão: executar sozinho.

Motivo: reversível, local, baixo impacto.

### Prisma vs Drizzle

Decisão: pedir usuário.

Motivo: muda stack travada.

### Tailwind tokens

Decisão: executar sozinho.

Motivo: design já travado.

### Trocar auth próprio por Supabase

Decisão: pedir usuário.

Motivo: muda estratégia de auth.

### Lib de máscara CPF/CNPJ

Decisão: consultar GPT se necessário; se gratuita e leve, executar.

## Saída esperada do GPT Decision Agent

```json
{
  "decision": "A",
  "confidence": "high",
  "requires_user": false,
  "summary": "Escolher A",
  "why": ["motivo objetivo"],
  "risks": ["risco"],
  "next_steps": ["passo 1"]
}
```
