# Web mobile UI review (375px)

Ambiente: código de `main` rodando local (dev DB) + páginas públicas de produção.
Telas logadas em produção ficam para quando houver sessão aberta pelo owner.

Status: `[ ]` a fazer · `[x]` feito.

## Fase 1 — 2026-10-03

### Críticos

- [x] **R1-01 Cabeçalho de página não quebra no mobile.** Páginas montam título+ações com
      flex inline em vez de `.ov-page-header` (que já tem a regra `@media (max-width: 640px)`).
      Título espremido, "Criar OS" em 2 linhas, "Salvar cliente" cortado fora da tela.
      Afeta: `clientes/novo`, `ordens-de-servico/novo` (e conferir todas as `page.tsx` de `(app)`).
      Correção: usar `.ov-page-header` (ou equivalente) em todos os cabeçalhos.
- [x] **R1-02 Conteúdo cortado sem rolagem.** `html,body{overflow-x:hidden}` esconde o excesso.
  - `ordens-de-servico/novo`: cards passam 15px da borda.
  - `equipe`: tabela corta coluna "Função"; email quebra no meio — virar lista/cards no mobile.
  - `orcamentos/novo`: stepper cortado ("Desconto e va…"); select de cliente espremido ("Selecior").
  - `agenda`: semana mostra 3 de 7 dias sem pista de rolagem — no mobile, visão dia/lista.
- [x] **R1-03 Hydration mismatch em todas as telas logadas.** Ícone `Home` do `AppSidebar`
      renderiza `d` diferente no servidor (`7-5.999`) e no cliente (`7-6`); React descarta o
      SSR e re-renderiza tudo (flash + lentidão). Persiste com `.next` limpo. Investigar origem
      do path divergente (lucide-react 1.16.0 em `apps/web`).

### Melhorias

- [x] R1-04 Dashboard e Financeiro: KPIs um por linha ocupam a tela — grid 2×2 no mobile.
- [x] R1-05 Padding lateral inconsistente: `equipe`, `financeiro`, `plano` com 32px; resto 16px.
- [x] R1-06 Configurações: menu de 10 itens empurra o formulário — select/tela própria no mobile.
- [x] R1-07 Signup: celular sem máscara; checkbox de termos com alvo de 16px (≥44px);
      passo 2 muda de alinhamento e não tem "Voltar".
- [x] R1-08 Novo cliente: telefone/telefone 2/email em 3 colunas espremidas — empilhar.
- [x] R1-09 Novo item do catálogo: placeholder `0,00` vs valor `0.00`; tipo Serviço pede
      quantidade/estoque.
- [x] R1-10 Abas com rolagem (Orçamentos, Documentos): esconder scrollbar.
- [x] R1-11 TopBar: logout solto no header (mover para o menu do avatar); sem marca Orcivo.
- [x] R1-12 Auth em produção: sem logo no mobile; "Manter conectado neste computador".
- [x] R1-13 Landing: links de nav/rodapé com <32px de altura.

### Fora do visual

- [x] R1-14 `pnpm run db:seed` falha com `ERR_MODULE_NOT_FOUND` (`@orcivo/shared-types`);
      dev DB segue com limites antigos (Livre = 5 OS). Vai falhar igual no deploy.

## Fase 2 — produção (sessão do owner, só leitura) + fluxos com dados local — 2026-10-04

Produção confirmou R1-01/R1-02 tela a tela (mesmo resultado do local).

### Críticos

- [x] **R2-01 Checkout rebaixa assinatura paga e não cancela a anterior.**
      `apps/backend/src/billing/subscription.service.ts` `createCheckout` faz upsert com
      `status: 'TRIALING'` incondicional e sobrescreve `asaas_sub_id` sem cancelar a
      assinatura anterior no Mercado Pago. Efeitos: (a) assinatura ACTIVE que inicia novo
      checkout vira "Aguardando pagamento" (visto em prod: Nidy `SOLO|TRIALING` com pagamento
      `confirmed` de 03/10 15:40, novo checkout 17:32); (b) preapproval antiga de cartão segue
      cobrando → risco de cobrança dupla. Correção: manter status atual até o novo pagamento
      confirmar (troca de plano = fluxo próprio), cancelar o recurso anterior no provider,
      teste cobrindo ACTIVE→novo checkout. Dado da Nidy em prod: decidir com o owner.
- [x] **R2-02 Tela de plano contradiz a fonte única.** `apps/web/app/(app)/plano/plans.ts`
      tem features hardcoded: Solo "3 usuários"/"OS em uso justo" (fonte: 1 membro, 30 OS),
      Mais "Até 10 usuários" (fonte: 3), Equipe "Multi-empresa" (não existe). Gerar a lista de
      `packages/shared-types/src/billing/plans.ts`.
- [x] **R2-03 Painel de notificações sai da tela à esquerda.** `components/TopBar.tsx:239`
      `width: 384` com `right: 0` numa tela de 375px — texto cortado. Usar
      `width: min(384px, calc(100vw - 32px))` / posição fixa nas bordas no mobile.
- [x] **R2-04 `client_id` ignorado em Novo orçamento.** Salvar cliente redireciona para
      `/orcamentos/novo?client_id=…`, mas o select fica em "Selecione um cliente".
- [x] **R2-05 Validade do orçamento anterior à criação.** Orçamento #1 em prod: criado
      03/10/2026, válido até 02/10/2026. Checar cálculo/padrão de `valid_until` (fuso?).

### Melhorias

- [x] R2-06 Plano: status de pagamento cru em inglês ("confirmed"); traduzir.
- [x] R2-07 Cliente: CPF, telefone e CEP sem máscara (form, lista e detalhe mostram
      `47997720817`); Bairro/Cidade/UF em 3 colunas minúsculas.
- [x] R2-08 CTAs mortos visíveis: "Buscar por CEP" (desabilitado), "Salvar e novo"
      (desabilitado), busca do topo "Busca em breve". Implementar (ViaCEP) ou esconder.
- [x] R2-09 Salvar cliente pula para Novo orçamento sem confirmação — mostrar toast e ir
      para o detalhe do cliente (com atalho "Criar orçamento").
- [x] R2-10 Listas (Clientes, Orçamentos) viram cards rótulo/valor enormes no mobile —
      linha compacta (nome · status · valor) com chevron.
- [x] R2-11 Plural: "1 clientes cadastrados".
- [x] R2-12 Menu lateral: sem botão fechar, sem "Sair", sem atalho para Plano/assinatura.
- [x] R2-13 Detalhe do orçamento: "Desconto − R$ 0,00" em vermelho quando zero.

## Resolução — 2026-10-04

Tudo acima corrigido, exceto as decisões registradas aqui:

- R1-07: sem "Voltar" no passo 2 do signup — o passo 1 já cria a conta (token
  temporário); voltar e reenviar daria e-mail duplicado. Feito: máscara, alvo 44px.
- R2-09: o salto para Novo orçamento é o atalho "Criar orçamento em seguida"
  (marcado por padrão); agora o cliente vem pré-selecionado (R2-04) e existe
  "Salvar e novo" com confirmação. Atalhos falsos (visita/obra) e etiquetas que
  nunca eram salvas foram removidos.
- R1-03: causa real era o bundle de servidor do web resolver `lucide-react@0.511`
  do site (hoist do pnpm); site alinhado em 1.16.
- Extra: modo bento grid opcional no Dashboard mobile (preferência por aparelho).
