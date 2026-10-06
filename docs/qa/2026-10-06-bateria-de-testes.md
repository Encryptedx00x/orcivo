# Bateria de testes — 06/10/2026

Ambiente: localhost (web :3001 Next dev, API :3000 NestJS), conta de testes `UI_AUDIT_EMAIL`.
Larguras: **desktop** = 1100–1440 px emulados; **celular** = 414 px (painel nativo).
App (Expo): sem aparelho/emulador nesta máquina — verificado por `tsc`, `eslint`, testes
`node --test` (76) e export do bundle Android. Não houve teste visual do app.

Legenda: ✅ ok · 🔧 bug achado e corrigido (commit) · ⚠️ limitação conhecida

## Modo fácil web — layout desktop (novo)

| #   | Teste                                                                                          | Resultado                                                            |
| --- | ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| D1  | ≥1024 px: barra lateral (10 itens), cabeçalho com trilha + "Modo fácil ligado", conteúdo largo | ✅ `22e0892`                                                         |
| D2  | <1024 px: layout de celular inalterado (barra inferior de 5 abas)                              | ✅                                                                   |
| D3  | Todas as 10 telas da barra lateral: sem rolagem horizontal, sem erro de carga, trilha certa    | ✅                                                                   |
| D4  | Barra de ação (Novo recibo, Q1–Q3) fica grudada no rodapé do conteúdo                          | 🔧 `overflow-x: hidden` no body quebrava `position: sticky` → `clip` |
| D5  | "Mais ações" abre como diálogo centralizado no desktop, folha inferior no celular              | ✅                                                                   |

## Modo fácil web — orçamentos

| #   | Teste                                                                                                          | Resultado                                                                                                                    |
| --- | -------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Q1  | Reenviar (sem pop-up → fallback abre WhatsApp)                                                                 | ✅                                                                                                                           |
| Q2  | Rascunho › Descartar rascunho → motivo → "Orçamento cancelado."                                                | ✅                                                                                                                           |
| Q3  | Copiar link de aprovação (clique real)                                                                         | 🔧 copiar depois do fetch perdia o gesto do toque (Safari/iPhone recusava) → `ClipboardItem` com promessa `22e0892`          |
| Q4  | Cliente recusou → 4 motivos → "Marcado como recusado." e vai para "recusados e vencidos"                       | ✅                                                                                                                           |
| Q5  | Recusado › Reabrir e mandar de novo → 3 motivos → volta a "Esperando resposta"                                 | ✅                                                                                                                           |
| Q6  | Enviado › Corrigir orçamento                                                                                   | 🔧 backend recusava SENT → DRAFT ("Transição inválida") em todas as superfícies → permitido; derruba o link aberto `4a4ca73` |
| Q7  | Corrigir / Continuar editando abre os 3 passos com cliente, itens, desconto, validade e condições do orçamento | 🔧 antes ia para a tela do modo completo (web) ou não existia (app) `4a4ca73`                                                |
| Q8  | Editar → +1 unidade → Revisar → Enviar: mesmo #4 atualizado (R$ 300,00), novo link, sem duplicar               | ✅                                                                                                                           |
| Q9  | Falha no envio + tentar de novo não cria orçamento duplicado                                                   | 🔧 agora atualiza o mesmo rascunho `4a4ca73`                                                                                 |
| Q10 | App modo completo: rascunho tem "Editar orçamento" (formulário com os dados), detalhe recarrega ao voltar      | 🔧 não existia `4a4ca73`                                                                                                     |
| Q11 | App modo completo: escolher cliente não reabre a lista de sugestões                                            | 🔧 `4a4ca73`                                                                                                                 |
| Q12 | "Abrir" no modo fácil (web) ia para a tela do modo completo                                                    | 🔧 rascunho abre na revisão (3 passos), os demais abrem o PDF; app: rascunho abre na revisão                                 |
| Q13 | PDF do orçamento (`/api/quotes/:id/pdf`) enviado e rascunho                                                    | ✅ 200 `application/pdf`                                                                                                     |
| Q14 | Q1–Q3 › Baixar PDF salva rascunho, abre o PDF, toast e volta à lista                                           | ✅                                                                                                                           |
| Q15 | Rascunho › Abrir → Passo 3 com os dados; Voltar: Passo 2 → Passo 1 → lista                                     | ✅                                                                                                                           |

## Página pública de aprovação (cliente)

| #   | Teste                                                                                                | Resultado                                                                                                                                                              |
| --- | ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P1  | Layout no celular (414 px)                                                                           | 🔧 cabeçalho e texto espremidos numa coluna, "Baixar PDF" quebrando, validade repetida, emoji no título → layout de celular                                            |
| P2  | Botão "Recusar" do cliente                                                                           | 🔧 **não fazia nada** (`reject flow TBD`) → `POST /quotes/public/:token/reject`, motivo opcional, auditoria CUSTOMER (aparece no sino do técnico)                      |
| P3  | Recusar com motivo "Achei caro" → tela "Orçamento recusado"; banco REJECTED + auditoria com o motivo | ✅                                                                                                                                                                     |
| P4  | Abrir de novo um link já respondido                                                                  | 🔧 mostrava os botões outra vez → mostra a resposta (aprovado/recusado) ou "não está mais disponível"                                                                  |
| P5  | Formas de aprovação no celular                                                                       | 🔧 abas rolando de lado escondiam "Foto da assinatura" → pílulas que quebram linha (as 4 visíveis)                                                                     |
| P6  | Foto da assinatura                                                                                   | 🔧 seletor nativo em inglês ("Choose File") → botão "Tirar ou escolher foto"; fotos de câmera (vários MB) eram recusadas (limite 1,5 MB) → reduzidas para 1200 px JPEG |
| P7  | Aprovar com foto → "Orçamento aprovado!" e OS criada                                                 | ✅                                                                                                                                                                     |
| P8  | Desconto percentual mostrava o percentual como dinheiro ("- R$ 10,00" para 10%)                      | 🔧 mostra o valor do desconto (subtotal − total)                                                                                                                       |
| P9  | Formulário de resposta abre fora da tela                                                             | 🔧 rola até ele                                                                                                                                                        |
| P10 | Sem internet mostrava "Failed to fetch"                                                              | 🔧 mensagem em pt-BR                                                                                                                                                   |
| P11 | Baixar PDF público                                                                                   | ✅ 200 `application/pdf`                                                                                                                                               |

## Notificações / Avisos

| #   | Teste                                                                                             | Resultado                                                                                                                                                                                      |
| --- | ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| N1  | Completo web: sino abre "Atividades" com 26 não lidas                                             | ✅                                                                                                                                                                                             |
| N2  | Completo web: "Marcar como lida" (clique real) → 26 → 25, `PATCH /api/notifications/:id/read` 200 | ✅ (o 401 relatado foi o middleware que não renovava a sessão em `/api/*`, corrigido antes)                                                                                                    |
| N3  | Com muitas não lidas só dava para marcar uma a uma                                                | 🔧 "Marcar todas como lidas" (`PATCH /notifications/read-all`) no sino do completo e em Avisos                                                                                                 |
| N4  | Texto das atividades: "via PHOTO_SIGNATURE (IP ::1)" e "OS #1 "OS #1""                            | 🔧 "aprovado pelo cliente (foto da assinatura)"; OS criada de orçamento passa a se chamar "Orçamento #N" (eventos antigos mantêm o texto antigo)                                               |
| N5  | **Modo fácil web e app (fácil e completo) não tinham notificações**                               | 🔧 tela "Avisos" (lista, marcar um, marcar todos, ver mais) + sino com contador no Início (celular) e no cabeçalho (desktop); app: sino no Início do fácil e "Avisos" no menu Mais do completo |
| N6  | Fácil web: sino 25 → Avisos → marcar todos → "Tudo em dia", sino sem contador                     | ✅                                                                                                                                                                                             |
| N7  | Novo cliente gera aviso; sino "1 novo" → marcar como lido → "Tudo em dia"                         | ✅                                                                                                                                                                                             |
| N8  | Desktop: sino no cabeçalho, sem sino duplicado no Início                                          | ✅                                                                                                                                                                                             |

## Clientes (modo fácil web)

| #   | Teste                                                           | Resultado                                                                    |
| --- | --------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| C1  | Novo cliente (nome + telefone com máscara) → salvo, lista com 3 | ✅                                                                           |
| C2  | Toast "Paula salvo" (concordância errada para nomes femininos)  | 🔧 "Cliente salvo: Paula." (também no cliente novo do orçamento e do recibo) |
