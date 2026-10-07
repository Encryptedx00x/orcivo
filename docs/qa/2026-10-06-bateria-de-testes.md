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

| #   | Teste                                                                                            | Resultado                                                                                                          |
| --- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| C1  | Novo cliente (nome + telefone com máscara) → salvo, lista com 3                                  | ✅                                                                                                                 |
| C2  | Toast "Paula salvo" (concordância errada para nomes femininos)                                   | 🔧 "Cliente salvo: Paula." (também no cliente novo do orçamento e do recibo)                                       |
| C3  | Cliente › Orçamento (pula para o Passo 2 com o cliente) e Serviço (Marcar horário com o cliente) | ✅                                                                                                                 |
| C4  | Cliente › Mais opções: WhatsApp (`wa.me/55…`), Editar, Excluir                                   | ✅                                                                                                                 |
| C5  | Editar cliente: telefone aparecia sem máscara ("11912345678"), CPF sem máscara, Cidade sem dica  | 🔧 máscaras de telefone e CPF/CNPJ (guarda só dígitos), dica "Ex.: Campinas" — também em Minha empresa (web e app) |
| C6  | Salvar edição (cidade + CPF) → "Dados do cliente salvos."; banco com dígitos                     | ✅                                                                                                                 |

## Agenda (modo fácil web; app com as mesmas correções)

| #   | Teste                                                                                                  | Resultado                                                                       |
| --- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| A1  | Marcar (Instalação, cliente, Amanhã, 1 h) → toast                                                      | ✅                                                                              |
| A2  | Depois de marcar para amanhã a agenda mostrava "Hoje" (o horário novo sumia) e o toast não dizia o dia | 🔧 abre no dia marcado; "Marcado para amanhã às 10:30."                         |
| A3  | Mais ações: Remarcar (pré-preenchido), Ligar, Ver cliente, Desmarcar                                   | ✅                                                                              |
| A4  | Remarcar para hoje → "Remarcado para hoje às 10:30." e a agenda mostra hoje                            | ✅                                                                              |
| A5  | Desmarcar → "desmarcado · Desfazer" → Desfazer recria                                                  | ✅ (erro no desfazer agora aparece)                                             |
| A6  | "Outro dia" no desktop não abria o calendário (só o ícone minúsculo do navegador abre)                 | 🔧 abre o calendário no clique (também no campo de data dos recibos/financeiro) |
| A7  | Horário padrão 10:30 mesmo às 17:40 (marcava no passado)                                               | 🔧 próximo horário cheio/meia hora a partir de agora                            |
| A8  | Web limitava 06:00–22:00 e o app 00:00–23:30                                                           | 🔧 os dois 00:00–23:30                                                          |

## Serviços (modo fácil web; app com as mesmas correções)

| #   | Teste                                                                                                           | Resultado                                                                                                                  |
| --- | --------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| S1  | Serviços de hoje: OS em andamento aparece mesmo sem horário                                                     | ✅                                                                                                                         |
| S2  | "Todos os serviços (modo completo)" tirava o usuário do modo fácil; serviço feito abria a tela do modo completo | 🔧 "Ver todos os serviços" dentro do modo fácil (em andamento primeiro, paginado, com data); feito abre na tela do serviço |
| S3  | App: cartões da lista sem "Mais ações" (a web tinha)                                                            | 🔧 mesma folha: Remarcar, Abrir serviço completo, Cancelar/Reabrir com motivo                                              |
| S4  | Foto do serviço aparecia quebrada (web fácil e **modo completo**)                                               | 🔧 o detalhe da OS devolvia a chave do arquivo em vez de URL assinada → `GET /work-orders/:id` e a lista assinam as fotos  |
| S5  | Enviar foto da galeria → "Foto guardada como Antes"; segunda → "Durante"; as duas aparecem                      | ✅                                                                                                                         |
| S6  | Finalizar serviço → "Pronto! Serviço finalizado"                                                                | ✅                                                                                                                         |
| S7  | OS criada pela aprovação se chamava "OS #1" (o número do orçamento, não o da OS)                                | 🔧 leva o nome do serviço: "Instalação de câmera e mais 1"                                                                 |

## Financeiro e Recibos (modo fácil web; app com as mesmas correções)

| #   | Teste                                                                                      | Resultado                                                                                                |
| --- | ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| F1  | Registrar › "Cobrança para receber depois" abria o Financeiro do modo completo (web e app) | 🔧 tela "Nova cobrança" no modo fácil (cliente, valor, referente a, vence em, ligar a orçamento/serviço) |
| F2  | Nova cobrança R$ 250,00 → "em A receber", aparece com "Vence 13/10"                        | ✅                                                                                                       |
| F3  | Marcar como pago → Pix → recebido sobe para R$ 1.890,50, "O recibo já está em Recibos"     | ✅                                                                                                       |
| F4  | Recibo nº 0005: papel com logo, valor, cliente, referente, forma e data                    | ✅                                                                                                       |
| F5  | Pôr minha assinatura no recibo → assinatura aparece                                        | ✅                                                                                                       |
| F6  | Enviar no WhatsApp → `wa.me/55…` com texto do recibo                                       | ✅                                                                                                       |
| F7  | Baixar PDF → 200 `application/pdf`, `recibo-0005.pdf`                                      | ✅                                                                                                       |
| F8  | Recibos: lista com 5, busca por nome                                                       | ✅                                                                                                       |
| F9  | Período: Este mês / Mês passado / Últimos 3 meses / Este ano                               | ✅                                                                                                       |
| F10 | Página pública offline: título "Link inválido" com mensagem de internet                    | 🔧 título "Sem conexão"                                                                                  |

## Configurações (modo fácil web; app com as mesmas correções)

| #   | Teste                                                                                                    | Resultado                                                                                                                                                                                                                                                                                                       |
| --- | -------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| G1  | Chave Pix sem máscara, sem exemplo e salvava qualquer texto                                              | 🔧 máscara por tipo (CPF, CNPJ, telefone), exemplo no campo, "Confira a chave" e Salvar bloqueado até ser válida                                                                                                                                                                                                |
| G2  | Pix e-mail incompleto bloqueia; completo → "Chave Pix salva."                                            | ✅                                                                                                                                                                                                                                                                                                              |
| G3  | Como o cliente aprova: desligar 3 → o último não desliga ("Pelo menos uma forma fica ligada.") → religar | ✅                                                                                                                                                                                                                                                                                                              |
| G4  | Condições padrão: 30 → 15 dias → "Condições salvas."                                                     | ✅                                                                                                                                                                                                                                                                                                              |
| G5  | **Produção**: desmarcar e marcar método de aprovação dava erro / "não pode"                              | 🔧 causa: assinatura BLOQUEADA no build antigo → toda gravação 403 "Sua assinatura está inativa". O deploy leva a correção (bloqueada/cancelada volta para Orcivo Livre). A tela mostrava "Erro ao salvar" genérico e o modo fácil "Seu perfil não pode fazer isso" → agora mostram a mensagem real do servidor |
