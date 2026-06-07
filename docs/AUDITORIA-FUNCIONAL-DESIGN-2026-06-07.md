# Auditoria — Funcional, Mock e Design (2026-06-07)

Revisão crítica do estado atual contra o handoff (`docs/handoff`, `docs/ui_kits`,
`docs/screens`). Cobre: testes automatizados, inventário de mock, fidelidade de
design e um plano de testes manual.

---

## 1. Status dos testes automatizados (backend)

`pnpm --filter backend test`

| Resultado | Detalhe |
|---|---|
| **9 suites OK / 34 testes** | auth, customer, quote, company, guards, quote-pdf, e2e |
| **4 suites de isolamento falham** | `*.isolation.spec.ts` (customer, catalog, quote, work-order) |

**Causa das 4 falhas (pré-existente, não é bug de produto):**
1. Banco de teste `orcivo_test` não existia → **provisionado nesta auditoria** (`prisma db push`).
2. `@react-pdf/renderer` (ESM) quebrava o parse do Jest → **corrigido** com mock manual em `src/__mocks__/@react-pdf/renderer.ts`.
3. **Ambiente E2E compartilhado (resta corrigir):** os 4 specs sobem o app real e
   batem no **mesmo Redis/Postgres** que o servidor de dev (sem DB de índice/Redis
   separado para teste). A autorização revalida no Redis a cada request; com estado
   compartilhado entre suites e com o dev server, o `GET /customers` volta `401`
   (membership não resolvida). O schema de `signup/company` está correto (aceita
   `document_type`/`document` opcionais — não é drift de contrato).
   **Ação recomendada:** isolar o ambiente de teste — Redis em índice dedicado
   (`REDIS_DB` de teste) e `cleanupDatabase` garantido entre suites; rodar E2E com
   `--runInBand`.

> O isolamento multi-tenant em si continua coberto e verde em `tenant.guard.spec`,
> `customer.service.spec` e `quote.service.spec`. As 4 suites são E2E de ambiente —
> hoje rodam (parse ESM e DB resolvidos), faltando apenas isolar Redis/estado.

**Web/site:** `tsc --noEmit` limpo nos três apps. Não há testes de UI automatizados.

---

## 2. Inventário de MOCK (o que precisa virar funcionalidade)

| Tela | Estado | O que é mock | Backend necessário | Prioridade |
|---|---|---|---|---|
| **Dashboard** | 🔴 100% mock | KPIs (5/12/8/R$2.480), "Bom dia, João", agenda do dia, últimas atividades, banner de plano | `GET /dashboard/summary` (contagens) + feed de `AuditLog` | **Alta** (1ª tela pós-login) |
| **Agenda** | 🔴 100% mock | `EVENTS` fixos; navegação de semana funciona, mas sem dados reais | **Módulo de Compromissos** (não existe): `Appointment` model + CRUD | **Alta** |
| **Financeiro** | 🟡 semi-real | Deriva de orçamentos (aprovado/aguardando). Não há "recebido" de verdade | **Módulo de Recebimentos** (`Payment`): registrar/baixar pagamento | **Alta** |
| **Equipe › Permissões por função** | 🟡 parcial | Membros/convites = **reais**. A seção "Permissões — Técnico" são toggles estáticos | Persistir permissões por `role` (ou ocultar até existir) | Média |
| **Plano › histórico** | 🟡 parcial | Cards de plano = conteúdo OK. `PAYMENTS` (histórico de cobrança) = mock | Ler de `subscription_payments` (tabela já existe) | Média |
| **Configurações** | 🟡 verificar | Abas estáticas; confirmar quais formulários realmente salvam (empresa/pix/aprovação salvam via API; visual/notif podem ser stub) | Endpoints de update por aba | Média |
| Clientes / Catálogo / OS / Orçamentos / Documentos | 🟢 real | — | — | — |

**Resumo:** as 3 lacunas que exigem **backend novo** são **Dashboard summary**,
**Agenda (Compromissos)** e **Financeiro (Recebimentos)**. As demais são "ligar fios"
em dados que já existem.

---

## 3. Revisão de design vs handoff

**Veredito geral: alta fidelidade.** `globals.css` do web espelha `tokens.json`/
`styles.css`: paleta roxa idêntica, Inter + JetBrains Mono carregados, `.ov-card`
radius 12, `.ov-badge` 600/11px, `.ov-table` header slate-50 uppercase, `.ov-input`
52px radius 12, focus ring roxo + halo. Ícones Lucide. pt-BR. Sem azul `#2563EB`.

### Ajustes concretos encontrados

| # | Área | Delta vs handoff | Status |
|---|---|---|---|
| 1 | **Login** | Painel esquerdo `520px` fixo parecia estreito em telas largas | ✅ ajustado para `clamp(520px, 42%, 700px)` — cresce em monitor grande |
| 2 | **PDF do orçamento** | Era Helvetica/cinza | ✅ refeito: Inter+JetBrains Mono embutidas, tokens exatos, total roxo |
| 3 | Botões (`.ov-btn`) | radius `10px`; auth e `.ov-btn-lg` usam `12px` | ⚠️ menor — handoff não fixa radius de botão; manter 10 é aceitável |
| 4 | Dashboard/Agenda | Visual fiel, **mas dados mock** (ver §2) | pendente (funcional) |

### Pontos a vigiar (não bloqueantes)
- **Sombra:** regra do handoff é "cards lideram com borda, sem sombra em repouso".
  Conferir modais/menus — sombra só em hover/modal/dropdown. (web OK no geral)
- **Gradiente:** só permitido na marca. O painel de auth usa gradiente (correto,
  é a área de marca). Nenhum gradiente em chrome de UI. ✅
- **Dinheiro:** sempre `R$ 1.234,56`, tabular, peso ≥600. ✅ no app e no PDF.

---

## 4. Plano de testes MANUAL (validar no navegador)

Subir tudo: backend (`pnpm --filter backend dev`), web (`--filter web`), site (`--filter site`).
Login: `dyogoho@gmail.com` (ou criar conta nova).

### A. Autenticação
- [ ] `/` deslogado → redireciona para `/login`
- [ ] Login com senha errada → "Credenciais inválidas"
- [ ] Login OK → cai em `/clientes`
- [ ] Signup 2 etapas (conta → empresa) → entra logado
- [ ] Links "Termos" e "Privacidade" abrem o site
- [ ] Painel esquerdo do login com largura agradável em monitor grande

### B. Clientes
- [ ] Listar, criar, abrir detalhe, editar, (excluir se houver)
- [ ] Cliente novo aparece na lista e no select de orçamento

### C. Orçamentos (fluxo crítico)
- [ ] Novo orçamento: botões bloqueados sem cliente + item
- [ ] "Salvar rascunho" → vai ao detalhe
- [ ] "Gerar PDF"/"Baixar PDF" → abre PDF com **acentos corretos** e layout do handoff
- [ ] Enviar orçamento → gera link de aprovação
- [ ] Compartilhar no WhatsApp → abre `wa.me` com o link
- [ ] Abrir link de aprovação (aba anônima) → aprovar por botão/nome/assinatura
- [ ] Após aprovar → vira OS automaticamente; PDF passa a ter assinatura

### D. Ordens de Serviço
- [ ] Listar, criar, abrir; anexar fotos BEFORE/DURING/AFTER; mudar status

### E. Catálogo
- [ ] Criar item; usá-lo no orçamento ("Do catálogo")

### F. Documentos
- [ ] Aba Orçamentos lista os reais; "Baixar PDF" e "Abrir" funcionam
- [ ] Aba OS lista as reais; abas Recibos/Contratos mostram estado vazio honesto

### G. Financeiro
- [ ] KPIs e tabela refletem orçamentos reais (não os nomes "Marcos Pereira" etc.)
- [ ] Filtro de status funciona; sem dados → estado vazio

### H. Equipe
- [ ] Convidar membro (e-mail) → aparece em "Convites pendentes"
- [ ] Revogar convite
- [ ] (Permissões por função: hoje é visual/estático — **não confiar** ainda)

### I. Itens que SÃO mock (não testar como real)
- [ ] Dashboard (KPIs/agenda/atividades) — placeholder
- [ ] Agenda (eventos) — placeholder
- [ ] Plano › histórico de cobrança — placeholder

---

## 5. Próximos passos priorizados

1. **Isolar ambiente E2E** (Redis em DB de teste + cleanup garantido + `--runInBand`) → 4 isolation specs verdes.
2. **Dashboard real:** endpoint de summary + feed de atividades (AuditLog).
3. **Financeiro real:** módulo de Recebimentos (`Payment`) — destrava "Recebido por dia".
4. **Agenda real:** módulo de Compromissos (`Appointment`).
5. **Equipe › permissões:** persistir por role ou ocultar até implementar.
6. **Plano › histórico:** ler de `subscription_payments`.
