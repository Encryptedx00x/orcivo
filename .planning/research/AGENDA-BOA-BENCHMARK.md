# Benchmark Agenda Boa → backlog Orcivo

**Data:** 2026-10-07 · **Fonte:** conta de teste autorizada em web.agendaboa.com (plano intermediário), só leitura/criação, nada existente editado ou apagado.
**Cobertura:** todos os módulos — Home, Pedidos, Documentos, Financeiro, Agenda, Clientes, Produtos & estoque, Serviços, Gerenciar (relatórios), Outras configurações e Planos. Três rodadas (2026-10-07), a última com fluxo ponta a ponta. Registros criados na conta de teste: compromisso "Teste benchmark Orcivo", cliente "Cliente teste Orcivo", pedidos 098-2026 e 099-2026 (duplicado), receita R$ 157,50 com recibo, custo R$ 80,00, documento Orçamento 098-2026. Termo de privacidade (18+) aceito com autorização do dono.

Ordem sugerida: **depois** de fechar os bugs abertos da bateria (`docs/qa/2026-10-06-bateria-de-testes.md`). Cada item abaixo é um candidato a fase/plano GSD; o que já existe no Orcivo está marcado.

---

## O que já temos (não refazer)

| Agenda Boa | Orcivo hoje |
|---|---|
| Escolher o que vai no documento (preços por item, subtotal, detalhes) | `doc_options`: preço de cada item, subtotal/desconto, total, validade, condições, Pix (padrão da empresa + por orçamento) |
| Título do documento ("geralmente só muda o título") | `QUOTE_DOC_TITLES`: Orçamento / Proposta / Pedido |
| Dados da empresa e do cliente no documento | Recibo com "Quem recebeu / Quem pagou"; orçamento com dados da empresa |
| Status aguardando aprovação / aprovado / cancelado | `QuoteStatus` + link de aprovação com PDF e recusa |
| Botão fixo "Novo pedido" | "Novo orçamento" na Home dos dois modos |

---

## P1 — Documento e orçamento (maior impacto, base pronta)

### AB-1 · Mais tipos de documento a partir do mesmo orçamento/OS
Hoje: 3 títulos. Agenda Boa tem ~16 (proposta comercial, contrato de serviço, fatura, lista de produtos, ordem de serviço, laudo técnico, laudo de higienização, nota de serviço, comprovante...).
- Adicionar em `QUOTE_DOC_TITLES`: `CONTRATO` (Contrato de serviço), `OS` (Ordem de serviço), `LAUDO` (Laudo técnico), `FATURA`… só os que fazem sentido para instalador (ar-condicionado, elétrica, CFTV, portões). Decidir a lista curta antes (máx. 6–7).
- "Lista de produtos" = documento só com materiais, sem mão de obra (útil para o cliente comprar peças).
- Gerar documento também a partir da **OS** (hoje só do orçamento).
- **Aceite:** escolher tipo → PDF com título certo nos 3 lugares (web completo, modo fácil, mobile) e no link público.

### AB-2 · Aparência do documento
- **Cor do documento** (paleta curta, padrão roxo Orcivo) — aplicar só ao PDF, não à UI.
- **Dados da empresa no cabeçalho ou no rodapé.**
- **Dados do cliente liga/desliga:** nome, endereço, telefone, e-mail.
- **Data do documento:** data atual / data do orçamento / perguntar ao gerar.
- Guardar em `companies.quote_default_doc_options` (mesmo JSONB, novos campos opcionais com default) — sem migration nova.

### AB-3 · Textos padrão
- Hoje temos "Condições" (um texto). Separar em: **Informações adicionais**, **Condições de garantia**, **Cláusulas de contrato** (esta só aparece no tipo Contrato).
- Cada texto entra no PDF conforme `doc_options`.

### AB-4 · Assinatura do cliente no documento
- Agenda Boa marca por tipo quais documentos levam assinatura. Nós já coletamos assinatura no link de aprovação: imprimir a assinatura/aceite (nome, data, método) no PDF depois de aprovado.

---

## P2 — Pedido/OS configurável por segmento (diferencial forte para instalador)

### AB-5 · Campos do segmento (liga/desliga por empresa)
Campos opcionais que a empresa ativa uma vez e aparecem no orçamento/OS:
- **Equipamento:** marca, modelo, aparelho/equipamento, nº de série, defeito relatado.
- **Prazos:** validade (data **ou** dias úteis), prazo de execução (data ou dias úteis), prazo/data de entrega.
- **Execução:** hora início, hora fim, duração do serviço, visita técnica (vira compromisso na agenda).
- Implementação lazy: um JSONB `segment_fields` em `work_orders`/`quotes` + lista ativa em `companies`. Sem tabela EAV.
- Presets por segmento no onboarding (ar-condicionado → marca/modelo/BTUs/nº série).

### AB-6 · Campos principais do pedido (liga/desliga)
Agenda Boa deixa esconder do formulário o que a empresa não usa: desconto, taxa de deslocamento, frete, outras taxas, condição de pagamento, forma de pagamento, garantia, fotos, arquivos, membros da equipe.
- Para nós: **taxa de deslocamento** e **garantia** são os que faltam e importam para instalador. Os outros só esconder/mostrar.

### AB-7 · Status configuráveis da OS
Hoje: Para fazer / Em execução / Concluída / Cancelada. Agenda Boa: pendente, aguardando aprovação, aprovado, em andamento, **aguardando pagamento**, enviado, contrato de manutenção, concluído, **garantia**, cancelado — a empresa escolhe quais usar.
- Adicionar ao enum: `AWAITING_PAYMENT`, `WARRANTY` (e talvez `MAINTENANCE_CONTRACT` junto com AB-11). Empresa liga/desliga os extras.
- Alinhar com backlog 999.4 (mudar status direto no painel).

### AB-8 · Lista de pedidos: abas "Todos" / "Por status", busca, filtro e ordenação
- Já temos busca e filtros parciais; falta a visão agrupada por status (estilo kanban simples) no web completo.

### AB-9 · Detalhe do pedido em abas: Pedido / Agenda / Financeiro
- Ver no mesmo lugar os compromissos e os recebimentos daquele serviço (a página do cliente já ganhou isso; replicar na OS).

---

## P3 — Financeiro

### AB-10 · Configurações financeiras
- **Categorias de despesa** (organizar custos) — hoje despesas não têm categoria.
- **Condições de pagamento** liga/desliga: à vista, entrada + restante, parcelado. Mostrar no orçamento ("50% de entrada, restante na conclusão") e gerar as cobranças a receber automaticamente ao aprovar.
- **Dados para receber:** chave Pix (já temos) + **conta bancária** (banco, agência, conta, titular) impressa no documento quando ligada.
- Moeda: ignorar (só BRL).

### AB-11 · Contratos de manutenção (recorrência)
- Status/tipo "contrato de manutenção" (no plano superior deles). Para instalador de ar-condicionado é ouro: limpeza a cada 6 meses gera OS + cobrança automática. Candidato a recurso do **Orcivo Mais/Equipe**.

---

## P4 — Home

### AB-12 · Atalhos personalizáveis e resumo do dia
- Atalhos que a empresa escolhe (novo orçamento, nova receita, novo compromisso, nova despesa).
- Widgets de resumo diário configuráveis. Nosso modo fácil já tem Home enxuta; aqui seria só no web completo.

### AB-13 · Indicação
- Agenda Boa dá 30 dias do plano superior por indicação via WhatsApp. Avaliar junto com billing (Nível C: mexe em preço/plano — dono já delegou, mas registrar decisão).

---

## P5 — Agenda, clientes, catálogo e relatórios (2ª rodada)

### AB-14 · Agenda: período em vez de hora, lembrete e status
- Horário por **período** (manhã 9–12, tarde 13–18, noite 19–22, horário comercial) **ou** início/fim; horas de cada período configuráveis. Técnico raramente promete hora exata — combina "de manhã".
- **Lembrete** por compromisso: 5 min, 15 min, 30 min, 1 h, 1 dia antes (push no app; no web, notificação do sino).
- Status do compromisso: não confirmado / agendado / concluído (cor na lista).
- Lista agrupada por dia (Hoje, Amanhã…) + calendário mensal com pontinho nos dias com compromisso; aviso "você tem compromissos pendentes" (passados sem concluir).
- **Repetir** (recorrência) — lá aparece como "ainda não implementado": oportunidade de sair na frente (casa com AB-11, manutenção semestral).

### AB-15 · Cliente: origem, aniversário, custos e contatos do celular
- **"Como conseguiu esse cliente?"** indicação / Instagram / Google / Facebook / outro → alimenta relatório "novos clientes por origem".
- **Aniversário** (lembrete opcional para mandar parabéns/oferta) e observações internas marcadas "o cliente não vê".
- Pessoa física/jurídica, até 2 telefones (já temos quase tudo).
- Página do cliente: **receitas e custos** do cliente (recebido / a receber / vencido; pago / previsto / vencido) e atalhos (nova receita, novo custo, novo compromisso, novo orçamento). Nossa página do cliente já mostra recebimentos; falta custo por cliente (depende de AB-10).
- App mobile: **salvar cliente nos contatos do celular** (sempre / nunca / perguntar) — cliente aparece com nome no WhatsApp. Expo Contacts.

### AB-16 · Catálogo: baixa automática de estoque, margem/markup, nome do catálogo
- Hoje temos quantidade e alerta de estoque baixo, **sem baixa automática**. Lá: assistente "baixar estoque quando o pedido estiver…" e a empresa marca os status (aprovado, em andamento, concluído…). Para nós: baixar quando o orçamento é aprovado **ou** quando a OS é concluída (escolha da empresa), devolver ao cancelar. Movimento registrado (auditoria).
- **Custo, margem (%) e markup (%)** calculando o preço de venda — é o backlog 999.13; adotar o mesmo trio de campos.
- Código interno e marca no produto; código de barras e foto ficam no plano mais alto lá (nós já temos foto).
- Unidades de medida editáveis pela empresa; renomear o catálogo ("Produtos" → "Peças").

### AB-17 · Duplicar orçamento, produto e serviço
- Está em todos os planos deles. Nós não temos. Botão "Duplicar" no orçamento (novo rascunho com os mesmos itens, cliente em branco ou o mesmo) e no item do catálogo.

### AB-18 · Relatórios (aba Gerenciar)
Filtro por período e, todos no plano mais alto deles: receitas × custos; recebido × custos pagos; recebido por forma de pagamento; recebido × vencido; custos pagos; a receber × custos previstos; top 5 clientes (por pedidos concluídos); novos clientes; novos clientes por origem.
- Nosso Financeiro já tem recebido por dia. Sugestão: relatórios no **Orcivo Mais/Equipe** com os 4 mais úteis primeiro (recebido × a receber, por forma de pagamento, top clientes, clientes por origem).

### AB-19 · Configurações gerais
- **Exportar todos os dados** (o usuário recebe tudo o que salvou) — também ajuda em LGPD (portabilidade). Nível C para o desenho jurídico; a exportação CSV em si é simples.
- Excluir conta ("medidas irreversíveis") separado do resto.
- Aceite de privacidade antes do 1º cadastro de cliente ("não repassamos dados dos seus clientes") — avaliar com LGPD (Nível C).

## P6 — Fluxo ponta a ponta (3ª rodada)

### AB-20 · Perfil do técnico: registro profissional e assinatura
- Perfil com foto, CPF, **registro profissional** (CREA/CFT/CRT) e **assinatura desenhada** uma vez — sai automaticamente em recibos e documentos ("Cidade, data / assinatura / nome").
- Nós já guardamos `technician_signature_key` no orçamento e `receipt_signature_key` no recibo; falta a assinatura **padrão no perfil** para não desenhar toda vez, e o registro profissional no PDF.

### AB-21 · Empresa: segmentos, redes sociais e frase no documento
- Segmentos (vários), WhatsApp comercial, site, Instagram, Facebook, YouTube — ícones no cabeçalho do PDF.
- Frase de rodapé ("Agradecemos a sua preferência") e slogan abaixo da logo.

### AB-22 · Orçamento/pedido mais completo
- Número com ano (098-2026), editável.
- Cadastro rápido de cliente sem sair do orçamento (o nosso já cria cliente no fluxo — conferir no modo completo web).
- **Desconto separado para serviços e para produtos**, em % ou R$, com atalhos 5% / 10%; PDF mostra "Desconto em serviços (10%)".
- **Condição de pagamento estruturada:** à vista / entrada (% ou R$; atalhos 30%, 50%) + restante na conclusão ou parcelado; texto livre extra. Sai no PDF como frase pronta.
- **Formas de pagamento aceitas** (marcar quais) impressas no PDF.
- **Garantia:** prazo (dias/meses/anos, atalhos 30/90 dias) + condições (texto padrão da empresa). Eles têm "gerar condições com IA" no plano superior.
- **Laudo:** texto livre (situação / observado / executado) que vira o documento "Laudo técnico" — casa com AB-1.
- Ao salvar pela 1ª vez o app pergunta o status.

### AB-23 · Financeiro por pedido e custos (base para AB-10/AB-18)
- Aba Financeiro do pedido: últimas receitas, últimos custos, **valor total, recebido, não lançado e resultado (lucro do serviço)**.
- Receita com "este valor se refere a…" (entrada 50%, parcela 1/3) — ótimo para recibo parcial.
- **Custos** (não temos): valor, categoria (≈28 prontas: combustível, alimentação, aluguel, impostos, fornecedor, matéria-prima, pró-labore, manutenção, marketing, funcionário…), pedido, cliente, vencimento, data e forma de pagamento (exigidas quando "Pago"), descrição, observações. Status pago / previsto / vencido.
- Resumo do financeiro por período: receitas (recebido, a receber, vencido), custos (pago, previsto, vencido) e **resultado**.

### AB-24 · Recibo com opções e impressão
- Ao emitir: mostrar serviços / preço de cada / subtotais / detalhes, com aviso "para recibo parcial, não ative tudo".
- Texto de declaração ("Declaro que recebi de X a quantia de R$ Y (entrada de 50%) em DD/MM/AAAA…").
- Compartilhar: **impressora térmica** (app), imprimir A4, baixar arquivo.

### Onde o Orcivo já está à frente
- **Link de aprovação para o cliente** (aceitar/recusar, ver PDF, assinatura/foto) — eles só geram PDF.
- Modo fácil para o técnico em campo; recibos numerados; notificações.

### Lições de UX (o que NÃO copiar)
- Formulário de cliente: ao fechar pergunta "salvar alterações?" mas **não tem "descartar"** — o usuário fica preso até salvar. No Orcivo: sempre oferecer "Descartar".
- Abrir um endereço direto ou recarregar desloga/perde estado (app Flutter). Nossas rotas web precisam continuar funcionando com link direto.
- Muitas funções aparecem com selo do plano superior no meio do formulário (foto, código de barras) — poluição; preferimos esconder ou mostrar uma vez com "Ver planos".

### Planos deles (referência de preço, mensal)
| Plano | Preço | Destaques |
|---|---|---|
| Básico | R$ 12,90 | pedidos, orçamentos e documentos, textos padronizados, agenda com lembrete, catálogos, recibos, financeiro com filtros, duplicar, versão PC |
| Intermediário | R$ 29,90 | + estoque, logo e cor nos documentos, fotos nos pedidos, assinar documentos, relatório do pedido, busca |
| Superior | R$ 54,90 | + contratos, assinatura do cliente, foto de produto, código de barras, gráficos do financeiro, novidades antes |
Teste grátis de 7 dias sem cartão; indicação dá 30 dias do plano superior. Comparar com nossos Orcivo Livre/Solo/Mais/Equipe ao revisar preços (dono já delegou a decisão).
