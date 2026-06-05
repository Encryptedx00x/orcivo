# Guia de Testes Manuais — Fase 3 (Monetização)

Cobre: limites de plano, site público, banner de inadimplência, convites de equipe.

## Pré-requisitos

Mesmos do `phase-2a-uat.md` (Docker, Node, pnpm, Expo Go).  
Adicionalmente:

```bash
# Subir infra (inclui Postgres + Redis + MinIO)
pnpm dev:infra

# Aplicar schema com as tabelas da Fase 3
npx prisma db push

# Sedar os planos (PlanLimit)
cd apps/backend && npx ts-node ../../prisma/seed.ts
cd ../..

# Verificar seed
# Esperado: 4 linhas com LIVRE/SOLO/MAIS/EQUIPE
```

---

## Setup: Terminais

```
Terminal 1: pnpm dev:backend     → http://localhost:3000
Terminal 2: pnpm dev:web         → http://localhost:3001
Terminal 3: cd apps/site && pnpm dev   → http://localhost:3002
Terminal 4: pnpm dev:mobile      → QR Code Expo
```

---

## 1. Limites de plano (GET /me/plan-limits)

| # | Passos | Esperado |
|---|---|---|
| 1.1 | Criar conta nova (signup web ou mobile) | Conta criada, plan_code = LIVRE |
| 1.2 | `curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/me/plan-limits` | `{"plan_code":"LIVRE","customers_max":5,"pdf_watermark":true,...}` |
| 1.3 | Criar 5 clientes no mobile ou web | Todos criados com sucesso |
| 1.4 | Tentar criar o 6° cliente | Erro 403 — "Limite de clientes atingido" |
| 1.5 | `curl .../me/subscription-status` com a mesma conta | `{"is_blocked":false,"is_past_due":false,"status":null}` |

---

## 2. Site público (http://localhost:3002)

| # | Passos | Esperado |
|---|---|---|
| 2.1 | Abrir http://localhost:3002 | Landing page carrega, título "Gestão para técnicos instaladores" |
| 2.2 | Verificar 3 cards de benefícios | "Orçamento em 2 minutos", "PDF com sua logo", "Aprovação pelo WhatsApp" |
| 2.3 | Clicar "Ver planos" | Navega para /planos |
| 2.4 | Verificar 4 cards de planos | "Orcivo Livre", "Orcivo Solo", "Orcivo Mais", "Orcivo Equipe" — sem "FREE", "PRO", "ilimitado" |
| 2.5 | Toggle "Anual" ↔ "Mensal" | Preços alternam, badge "-30%" aparece no toggle anual |
| 2.6 | Card "Orcivo Livre" → botão "Criar conta grátis" | Link aponta para app (não checkout) |
| 2.7 | Card "Orcivo Mais" → botão "Assinar agora" | Navega para /checkout?plan=MAIS_YEARLY (ou MAIS_MONTHLY) |
| 2.8 | Verificar /checkout | Mostra resumo do plano, botões "Pagar com PIX" e "Pagar com Cartão" |
| 2.9 | Clicar "Pagar com PIX" sem API key configurada | Erro 500 controlado — "Erro ao processar pagamento" (esperado em dev) |
| 2.10 | Acessar /termos e /privacidade | Páginas carregam com conteúdo (sem erro 404) |
| 2.11 | Footer: links "Planos", "Termos de Uso", "Privacidade" | Todos navegam para as páginas corretas |

---

## 3. Banner de inadimplência — Web (http://localhost:3001)

Para testar o banner, é preciso forçar o status via banco diretamente:

```sql
-- Conectar no banco local
psql postgresql://orcivo:orcivo@localhost:5432/orcivo_dev

-- Encontrar company_id da conta de teste
SELECT id, trade_name, plan_code FROM companies;

-- Inserir subscription PAST_DUE
INSERT INTO subscriptions (id, company_id, plan_code, status, grace_period_days, created_at, updated_at)
VALUES (gen_random_uuid(), '<company_id>', 'MAIS', 'PAST_DUE', 3, NOW(), NOW());
```

| # | Passos | Esperado |
|---|---|---|
| 3.1 | Inserir subscription PAST_DUE conforme SQL acima | — |
| 3.2 | Abrir http://localhost:3001 (logado) e recarregar | Banner âmbar aparece no topo: "Há um pagamento pendente. Acesse orcivo.com.br para regularizar." |
| 3.3 | Clicar "Ver planos" no banner | Abre orcivo.com.br/planos (ou localhost:3002/planos em dev) |
| 3.4 | Atualizar status para BLOCKED no banco: `UPDATE subscriptions SET status='BLOCKED' WHERE company_id='...'` | — |
| 3.5 | Recarregar web | Banner vermelho: "Sua assinatura está inativa. Acesse orcivo.com.br para regularizar." |
| 3.6 | Verificar que ainda é possível **ver** dados (dashboard, lista de clientes) | Dados visíveis |
| 3.7 | Tentar criar novo cliente com status BLOCKED | Erro 403 (SubscriptionStatusGuard bloqueia criação) |
| 3.8 | Restaurar: `UPDATE subscriptions SET status='ACTIVE'` | Banner some após recarregar |

---

## 4. Banner de inadimplência — Mobile

Mesma configuração do banco (seção 3). Com subscription PAST_DUE inserida:

| # | Passos | Esperado |
|---|---|---|
| 4.1 | Abrir app mobile (Expo Go) com a mesma conta | Banner âmbar aparece no topo da tela, acima das tabs |
| 4.2 | Navegar entre tabs (Clientes, Orçamentos, Mais) | Banner permanece visível em todas as tabs |
| 4.3 | Verificar mensagem | Sem preço, sem menção a "fora do app" — só "Acesse orcivo.com.br para regularizar." |
| 4.4 | Com status ACTIVE | Banner não aparece |

---

## 5. Convites de equipe — Web

Requer conta com plano que permite membros (ex: MAIS = 3 membros).

```sql
-- Garantir plan_code MAIS na company de teste
UPDATE companies SET plan_code='MAIS' WHERE id='<company_id>';
```

| # | Passos | Esperado |
|---|---|---|
| 5.1 | Logar na web com conta owner → `/equipe` | Página "Equipe" carrega, lista o owner como único membro |
| 5.2 | Clicar "Convidar" | Modal abre com campos e-mail e função |
| 5.3 | Preencher e-mail válido + função "Técnico" → "Enviar convite" | Convite aparece na seção "Convites pendentes" |
| 5.4 | Verificar log do backend (MAIL_PROVIDER=console) | Log mostra `[DEV EMAIL] To: <email>` com link de convite |
| 5.5 | Copiar o token do log → abrir `/convite/<token>` | Formulário de aceitar convite aparece |
| 5.6 | Preencher nome + senha (novo usuário) → "Aceitar convite" | Redirect para /dashboard, membro aparece na lista |
| 5.7 | Clicar ícone de lixeira no convite pendente | Convite removido da lista |
| 5.8 | Tentar convidar além do limite (LIVRE = 1 membro) | Erro 403 — "Limite de membros atingido" |

---

## 6. Checklist final (smoke)

```bash
# TypeCheck backend
cd apps/backend && npx tsc --noEmit && echo "OK"

# TypeCheck web
cd apps/web && npx tsc --noEmit && echo "OK"

# TypeCheck site
cd apps/site && npx tsc --noEmit && echo "OK"

# Testes unitários
cd apps/backend && npx jest --passWithNoTests --testPathIgnorePatterns="e2e|isolation" --forceExit
# Esperado: ≥ 34 tests passed

# Palavras proibidas no site
grep -ri "ilimitado\|FREE\b\|TOP\b\|PRO\b\|14 dias\|pague fora" apps/site/app/ && echo "FALHOU" || echo "OK"

# Sem preço no mobile
grep -r 'R\$\|reais' apps/mobile/src/components/SubscriptionBanner.tsx && echo "FALHOU" || echo "OK"
```

---

## Notas

- **Checkout real com Asaas:** requer `ASAAS_API_KEY` e `ASAAS_ENV=sandbox` no `.env`. Ver `asaas-setup.md`.
- **E-mails de convite em dev:** aparecem apenas no log do terminal do backend (ConsoleMailService).
- **Banner no mobile em dev:** o `/me/subscription-status` retorna `is_blocked:false` se não houver subscription no banco — inserir manualmente para testar.
- **Limpar banco após teste:** `npx prisma db push --force-reset` (apaga tudo e recria).
