# Catálogo de testes — Orcivo

Roteiro fixo para cada rodada de QA. Rodar na ordem; marcar no log da rodada (`docs/qa/AAAA-MM-DD-*.md`)
só o que **falhou ou mudou** — o que passou entra como "✅ bloco X".

## 0. Preparação (5 min)

| Passo           | Como                                                                                                                                                                                         |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Backend         | preview `orcivo-backend` (:3000). Antes de `prisma generate`, parar o backend (DLL travada).                                                                                                 |
| Web             | preview `orcivo-web` (:3001). Se travar em "Carregando…"/"Element type invalid" após muitos HMR, reiniciar o preview (não é bug).                                                            |
| App (navegador) | preview `orcivo-mobile-web` (:8081, Expo web, 1º bundle ≈50 s). `expo-secure-store` é trocado por `web-shims/` só no web. CORS: `ALLOWED_ORIGINS` do backend inclui `http://localhost:8081`. |
| Site            | preview `orcivo-site` (:3002).                                                                                                                                                               |
| Conta           | `UI_AUDIT_EMAIL` / `UI_AUDIT_PASSWORD` em `apps/web/.env.local` (digitar com clique + teclado; `form_input` não atualiza o estado do React). Não repetir a senha em relatórios.              |
| Larguras        | **celular** 375×812 (`resize_window` preset mobile) · **notebook** 1100 px · **desktop** 1280–1440 px. Voltar para `desktop` ao terminar.                                                    |
| Checagem rápida | No console do web: `fetch` em todas as rotas de §4.1 → 200 e sem "Application error". `document.documentElement.scrollWidth === innerWidth` em cada tela (sem rolagem lateral).              |

Superfícies (6): **WF-D** web fácil desktop · **WF-M** web fácil celular · **WC-D** web completo desktop ·
**WC-M** web completo celular · **AF** app fácil · **AC** app completo. Cada bloco abaixo diz em quais rodar.

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

| ID  | Passos                                           | Esperado                                                   |
| --- | ------------------------------------------------ | ---------------------------------------------------------- |
| D1  | `git archive HEAD` → scp → `bash /tmp/deploy.sh` | "HEALTH: healthy healthy healthy" + DEPLOY_DONE            |
| D2  | Pós-deploy em app.orcivo.com.br (conta do dono)  | Login, criar rascunho, abrir link de aprovação, baixar PDF |
| D3  | Rollback pronto                                  | tags `prev-*` existem                                      |
