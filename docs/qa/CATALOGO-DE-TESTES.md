# Catálogo de testes — Orcivo

Roteiro fixo para cada rodada de QA. Rodar na ordem e registrar no log da rodada
(`docs/qa/AAAA-MM-DD-*.md`) cada combinação obrigatória com resultado e evidência. Desde o Batch 4,
"✅ bloco X" sem superfície, modo, viewport/build e ação exercitada não encerra tarefa de UI.

## 0. Preparação (5 min)

| Passo           | Como                                                                                                                                                                                         |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Backend         | preview `orcivo-backend` (:3000). Antes de `prisma generate`, parar o backend (DLL travada).                                                                                                 |
| Web             | preview `orcivo-web` (:3001). Se travar em "Carregando…"/"Element type invalid" após muitos HMR, reiniciar o preview (não é bug).                                                            |
| App (navegador) | preview `orcivo-mobile-web` (:8081, Expo web, 1º bundle ≈50 s). `expo-secure-store` é trocado por `web-shims/` só no web. CORS: `ALLOWED_ORIGINS` do backend inclui `http://localhost:8081`. |
| Site            | preview `orcivo-site` (:3002).                                                                                                                                                               |
| Conta           | `UI_AUDIT_EMAIL` / `UI_AUDIT_PASSWORD` em `apps/web/.env.local` (digitar com clique + teclado; `form_input` não atualiza o estado do React). Não repetir a senha em relatórios.              |
| Viewports web   | **desktop** 1440×900 · **iPhone 16** 390×844 · **Android** 360×800. Usar dimensões exatas no navegador integrado e remover o override ao terminar.                                           |
| Checagem rápida | No console do web: `fetch` em todas as rotas de §4.1 → 200 e sem "Application error". `document.documentElement.scrollWidth === innerWidth` em cada tela (sem rolagem lateral).              |

Superfícies (6): **WF-D** web fácil desktop · **WF-M** web fácil celular · **WC-D** web completo desktop ·
**WC-M** web completo celular · **AF** app fácil · **AC** app completo. Cada bloco abaixo diz em quais rodar.

### 0.1 Gate obrigatório por tarefa de UI (Batch 4 em diante)

Uma tarefa de UI só recebe `[x]` quando o registro de QA contém:

| Campo                  | Valor obrigatório                                                                                                                                              |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Build                  | commit testado; web/backend locais; no app, perfil e origem da build                                                                                           |
| Web                    | `1440×900`, `390×844` e `360×800`, em fácil e completo quando o fluxo existir                                                                                  |
| App                    | fácil e completo em Expo web para inspeção inicial e em build nativa equivalente à distribuição quando o comportamento depender de runtime/configuração nativa |
| Fluxo                  | passos completos e ação real; não substituir download, voltar, upload, concorrência ou confirmação por inspeção de URL/código                                  |
| Resultado              | `passou`, `falhou`, `não reproduzido` ou `não aplicável`; os dois últimos exigem justificativa e evidência do comportamento equivalente                        |
| Layout                 | screenshot/checklist e `document.documentElement.scrollWidth <= window.innerWidth` em cada viewport web                                                        |
| Evidência automatizada | comando exato, exit code e contagem; integração de backend sempre serial com `--runInBand`                                                                     |
| Segurança              | somente dados locais; screenshots, logs e commits sem senha, token, chave, dados pessoais reais ou valores de `.env.local`                                     |

Rotas públicas, como `/approve/[token]`, não pertencem aos modos fácil/completo: registrar uma única rota
responsiva nos três viewports e marcar a dimensão de modo como `não aplicável`. Não atribuir o fluxo ao app
nativo quando ele apenas abre um link no navegador externo.

### 0.2 Cenários de regressão que não podem ser simulados

| ID  | Cenário                                  | Prova mínima                                                                                                                                                        |
| --- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R01 | Trocar fácil ↔ completo no meio do fluxo | Criar/editar em um modo, alternar antes de concluir, reabrir no outro e comparar IDs, estado, fotos e valores persistidos                                           |
| R02 | Concorrência                             | Duas abas/sessões carregadas antes da primeira ação; agir em ambas; provar resposta amigável e uma única mutação/auditoria esperada                                 |
| R03 | Download real                            | Esperar evento de download, confirmar nome/tamanho/tipo/`Content-Disposition` e abrir o arquivo salvo; repetir a limitação conhecida de navegador/PWA               |
| R04 | Limites de recebimento                   | Valor abaixo, igual e acima do esperado usando strings decimais; no excedente, conferir valores/diferença, confirmação, motivo e persistência                       |
| R05 | Conteúdo digitado mas não adicionado     | Preencher item, tocar Continuar, testar “Adicionar item e continuar” e descarte consciente                                                                          |
| R06 | Voltar depois de gerar                   | Gerar uma vez, usar voltar do produto e do navegador; provar destino definido e ausência de edição/duplicação acidental                                             |
| R07 | App distribuído                          | Build de produção/preview equivalente, configuração resolvida sem revelar URL, checagem automática contra localhost/loopback e autenticação real somente após B4-15 |
| R08 | Estado vazio e estado preenchido         | Executar ambos para assinatura, logo, configurações e listas; conferir verbo correto e ausência de dado fantasma                                                    |

### 0.3 Matriz mínima do registro visual

Usar uma linha por combinação, mesmo quando várias linhas apontarem para o mesmo print:

| Superfície | Modo     | Viewport/build | Fluxo/estado | Resultado | Overflow | Evidência | Observação |
| ---------- | -------- | -------------- | ------------ | --------- | -------- | --------- | ---------- |
| web        | fácil    | 1440×900       |              |           |          |           |            |
| web        | completo | 1440×900       |              |           |          |           |            |
| web        | fácil    | 390×844        |              |           |          |           |            |
| web        | completo | 390×844        |              |           |          |           |            |
| web        | fácil    | 360×800        |              |           |          |           |            |
| web        | completo | 360×800        |              |           |          |           |            |
| app        | fácil    | build/perfil   |              |           | n/a      |           |            |
| app        | completo | build/perfil   |              |           | n/a      |           |            |

### 0.4 Cobertura automática exigida pelos achados 1–18

| Achado | Automação mínima                                                                         | Tarefa que entrega |
| -----: | ---------------------------------------------------------------------------------------- | ------------------ |
|      1 | teste de ausência de overflow horizontal nos três viewports e estados longos             | B4-06              |
|      2 | evento de download + headers/nome/tipo, separado do teste de visualização                | B4-08              |
|      3 | duas aprovações concorrentes; uma aprovação, uma OS e cobranças sem duplicação           | B4-01 ✅           |
|      4 | integração aprovação → OS no estado inicial pendente                                     | B4-02              |
|      5 | persistência/hidratação de estado e foto após troca de modo e reabertura                 | B4-03              |
|      6 | integração condições → A receber → baixa → recibo, com refresh das listas                | B4-04              |
|      7 | contrato de atribuição opcional e testes das superfícies após ADR de nomenclatura        | B4-19/B4-20        |
|      8 | modal de data sem overflow nos três viewports, incluindo controle nativo                 | B4-07              |
|      9 | comparação Decimal abaixo/igual/acima, confirmação e motivo obrigatório quando aplicável | B4-05              |
|     10 | renderização com e sem assinatura salva                                                  | B4-09              |
|     11 | inventário/contrato das opções de recibo e persistência da configuração                  | B4-23/B4-27        |
|     12 | transformação da logo (crop/zoom/reposição), cancelar/salvar e orientação                | B4-14              |
|     13 | duração por relógio controlado e dispensa imediata por OK                                | B4-10              |
|     14 | guard de item não adicionado: adicionar e continuar ou descartar                         | B4-11              |
|     15 | histórico/destino após gerar e prevenção de duplicação                                   | B4-13              |
|     16 | build distribuída falha para localhost, `127.0.0.1` e `::1`                              | B4-15              |
|     17 | auditoria de versão/build, Home e existência real do fluxo de convite                    | B4-17              |
|     18 | comando reproduzível de análise do bundle e orçamento de tamanho                         | B4-18              |

## 1. Orçamento (WF-D, WF-M, WC-D, WC-M, AF, AC)

| ID  | Passos                                                                                        | Esperado                                                                                                |
| --- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| O1  | Novo orçamento → cliente existente → 1 item do catálogo → revisar                             | Total = preço × qtd; quantidade "1" (sem ",00"); valores em `R$ 0,00`                                   |
| O2  | Mesmo fluxo com **cliente novo** criado dentro do fluxo                                       | Cliente volta selecionado; aparece em Clientes                                                          |
| O3  | Item avulso com preço 1.234,56 e qtd 3                                                        | Total R$ 3.703,68 (decimal, sem arredondar errado)                                                      |
| O4  | Desconto % e R$                                                                               | Subtotal, desconto e total corretos; não negativo                                                       |
| O5  | "Mais opções": validade, condições, **o que vai no orçamento** (nome do documento + 6 chaves) | Salva; PDF e link respeitam (ver O9)                                                                    |
| O6  | **Concluir orçamento** (fácil) / **Enviar** (completo)                                        | Status Enviado; número novo; tela final com WhatsApp, PDF, copiar link                                  |
| O7  | Guardar rascunho → sair → "Continuar editando"                                                | Volta nos 3 passos com tudo preenchido                                                                  |
| O8  | Enviado → Corrigir orçamento                                                                  | Vira rascunho, link antigo deixa de abrir                                                               |
| O9  | Link de aprovação (copiar e abrir em aba anônima)                                             | **URL completa** com domínio; mostra só o que está ligado em "o que vai no orçamento"; Ver PDF / Baixar |
| O10 | Aprovar pelo link (cada método: botão, assinatura, foto)                                      | Status Aprovado; OS criada com título dos itens; aviso no sino                                          |
| O11 | Recusar pelo link                                                                             | Motivo salvo; status Recusado; aviso                                                                    |
| O12 | Reenviar / Reabrir recusado / Cancelar / Descartar rascunho                                   | Estados e textos certos; sem erro 403 em conta ativa                                                    |
| O13 | Baixar PDF                                                                                    | Abre/baixa; dados da empresa e do cliente; assinatura do técnico quando ligada                          |

## 2. Ordem de serviço (todas)

| ID  | Passos                                          | Esperado                                                       |
| --- | ----------------------------------------------- | -------------------------------------------------------------- |
| S1  | Lista de OS                                     | Mostra cliente, status e **total** (vem do orçamento)          |
| S2  | Nova OS avulsa (web completo)                   | Cria; aparece na lista e no cliente                            |
| S3  | Iniciar → fotos antes/durante/depois → concluir | Fotos aparecem (URLs assinadas); status Concluída              |
| S4  | Reabrir com justificativa                       | Justificativa no histórico                                     |
| S5  | Detalhe                                         | Total, data marcada, orçamento vinculado, cliente com WhatsApp |

## 3. Dinheiro, recibos e cobranças (todas)

| ID  | Passos                                      | Esperado                                                                    |
| --- | ------------------------------------------- | --------------------------------------------------------------------------- |
| F1  | Registrar recebimento (Pix, dinheiro)       | Recibo numerado; "Quem recebeu / Quem pagou" com documento e endereço       |
| F2  | Nova cobrança com vencimento                | Aparece em A receber; vencida vira Atrasado                                 |
| F3  | Editar recebimento pago (só data) e excluir | Texto de exclusão com valor em `R$ 0,00`; aviso no sino com valor formatado |
| F4  | Recibo: Abrir / Enviar                      | PDF ok; WhatsApp com link                                                   |
| F5  | Gráfico recebido por dia (web)              | Hover com valor                                                             |

## 4. Navegação e telas

### 4.1 Rotas do web (WC-D e WC-M)

`/dashboard /clientes /clientes/novo /clientes/[id] (6 abas) /catalogo /catalogo/novo /catalogo/[id]/editar /catalogo/importar /orcamentos /orcamentos/novo /orcamentos/[id] /ordens-de-servico /ordens-de-servico/novo /ordens-de-servico/[id] /agenda /financeiro /documentos (3 abas) /equipe /plano /configuracoes (abas, inclusive Minha conta) /facil /login /signup /forgot-password /approve/[token]`

| ID  | Esperado em cada rota                                                            |
| --- | -------------------------------------------------------------------------------- |
| N1  | 200, sem erro no console, sem rolagem lateral em 375 px                          |
| N2  | Tabelas: ações visíveis em 1100 px (não cortadas)                                |
| N3  | Textos 100% pt-BR (inclusive botões nativos de arquivo: "Escolher foto/arquivo") |
| N4  | Carregando → nunca mostra "0 itens / nenhum" antes de terminar                   |

### 4.2 Modo fácil (WF-D, WF-M, AF)

Home (atalhos, sino), Orçamentos, Clientes (ligar/WhatsApp), Agenda (Hoje/Amanhã, ← →, marcar), Menu: Serviços de hoje (+ ver todos), Financeiro, Recibos, Documentos, Meus serviços e preços, Configurações (máscaras de telefone/CPF/Pix, endereço, logo, métodos de aprovação, assinatura, o que vai no orçamento), Meu plano, Sair (confirma).
Desktop (WF-D ≥1024 px): barra lateral com 10 itens, conteúdo até 860 px, folhas viram diálogos.

### 4.3 App completo (AC)

Abas Início/Clientes/Orçamentos/Agenda/Mais; Mais: Modo fácil, OS, Catálogo, Financeiro, Recibos, Avisos (marcar lido / todos), Documentos (3 abas), Conta, Configurações, Usuários e permissões, Plano e assinatura, Ajuda (abre e-mail), Sair.

## 5. Conta, plano e permissões

| ID  | Passos                                            | Esperado                                                  |
| --- | ------------------------------------------------- | --------------------------------------------------------- |
| P1  | Desmarcar e marcar de novo um método de aprovação | Salva sem 403 (conta ativa)                               |
| P2  | Conta com assinatura bloqueada                    | Mensagem clara do servidor; rotina de carência roda 00:00 |
| P3  | Plano: cartões no celular                         | Um por linha; preço inteiro numa linha                    |
| P4  | Equipe                                            | "Carregando…" → membros; convite                          |
| P5  | Notificações                                      | Marcar como lida e todas; contador do sino atualiza       |

## 6. Site (orcivo.com.br)

| ID  | Esperado                                                                              |
| --- | ------------------------------------------------------------------------------------- |
| W1  | Home, /planos, /termos, /privacidade, /download abrem sem erro em 375 e 1280 px       |
| W2  | Termos e Privacidade **sem marcadores** `[...]`; responsável e hospedagem preenchidos |
| W3  | Preços dos planos iguais ao app (Livre, Solo, Mais, Equipe)                           |

## 7. Automático (rodar sempre antes de commit)

| Pacote       | Comando                                                                                                                                                        |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| backend      | `npx tsc --noEmit -p tsconfig.json` · `npx jest src/<módulo> --runInBand` (integração usa `.env.test`; antes, `prisma db push` no `orcivo_test` — ver runbook) |
| web          | `npx tsc --noEmit` · testes `*.browser.test.cjs`                                                                                                               |
| app          | `npx tsc --noEmit` · `pnpm lint` · `node --test src/hooks/*.test.mjs src/services/*.test.mjs src/screens/*/*.test.mjs` (76)                                    |
| shared-types | `npm run build` antes do backend ver mudanças                                                                                                                  |
| site         | `npx tsc --noEmit -p .`                                                                                                                                        |

## 8. Deploy e produção

| ID  | Passos                                                                     | Esperado                                                   |
| --- | -------------------------------------------------------------------------- | ---------------------------------------------------------- |
| D1  | `git archive HEAD` → scp (+ `infra/vps/deploy.sh`) → `bash /tmp/deploy.sh` | "HEALTH: healthy healthy healthy" + DEPLOY_DONE            |
| D2  | Pós-deploy em app.orcivo.com.br (conta do dono)                            | Login, criar rascunho, abrir link de aprovação, baixar PDF |
| D3  | Rollback pronto                                                            | tags `prev-*` existem                                      |
