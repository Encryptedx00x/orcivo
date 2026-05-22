# Phase 1: Vertical Slice — Discussion Log

**Date:** 2026-05-21  
**Method:** Decisions captured from user in previous session (context ran out before CONTEXT.md was written); handoff preserved in `.continue-here.md` and written to CONTEXT.md in subsequent session.

---

## Gray Areas Discussed

### 1. Signup experience

**Question:** Fluxo de cadastro: etapas, campos, comportamento pós-signup.  
**Decision:** 2 etapas sequenciais. Etapa 1: usuário (nome, e-mail, telefone, senha, aceitar termos). Etapa 2: empresa (nome_fantasia obrigatório, tipo_documento CPF/CNPJ, documento opcional, telefone, cidade/UF, cor_da_marca, logo, chave_pix opcionais). Após criar empresa → entrar no app no contexto dessa empresa. Plano inicial: Orcivo Livre.

### 2. Navegação mobile

**Question:** Estrutura de bottom tabs e conteúdo do "Mais".  
**Decision:** 5 tabs: Início | Clientes | Orçamentos | Agenda | Mais. "Mais" contém: Ordens de Serviço, Catálogo, Financeiro, Documentos, Conta, Configurações, Usuários e permissões, Plano e assinatura, Ajuda. Seguir fielmente o design handoff. Na Fase 1, apenas Auth e Customer funcionais; demais = placeholder "Em breve".

### 3. Navegação web

**Question:** Sidebar com quais itens e subitens de Configurações.  
**Decision:** 9 itens: Dashboard | Clientes | Catálogo | Orçamentos | Ordens de Serviço | Agenda | Financeiro | Documentos | Configurações. Configurações: Empresa, Identidade visual, Chave Pix, Usuários e permissões, Plano e assinatura, Segurança, Exportação de dados. Seguir design handoff. Na Fase 1, apenas Auth e Clientes funcionais.

### 4. Customer: campos do vertical slice

**Question:** Quais campos incluir no Customer para provar o molde sem exagerar.  
**Decision:** nome (obrigatório), tipo PF/PJ (opcional), cpf_cnpj (opcional), telefone (recomendado), email (opcional), cidade/UF (opcional), observacoes (opcional), assigned_to_user_id (opcional). Sem anexos, múltiplos contatos ou histórico. O slice deve provar criação/listagem no backend, criação no mobile e web, company_id obrigatório, e isolamento entre tenants em CI.

### 5. Auth: escopo da Fase 1 e 2FA

**Question:** O que incluir em Auth na Fase 1; implementar 2FA?  
**Decision:** Implementar: signup (e-mail + senha + argon2), login, JWT access + refresh token, validação de membership, company context (TenantGuard), logout. **2FA/TOTP: não implementar na Fase 1.** Registrar ADR-012. Decisão sobre reset de senha deixada a critério do planner.

---

## Deferred

- 2FA/TOTP — fase de segurança futura
- Verificação de e-mail no signup
- Reset de senha (pode ir para Fase 2)
- Social login, multi-device, notificações push
- Onboarding wizard pós-signup
