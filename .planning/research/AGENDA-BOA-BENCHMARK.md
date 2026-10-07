# Benchmark Agenda Boa → backlog Orcivo

**Data:** 2026-10-07 · **Fonte:** conta de teste autorizada em web.agendaboa.com (plano intermediário), só leitura/criação, nada existente editado ou apagado.
**Cobertura:** Home, Preferências de Documentos, Preferências de Pedidos (status, campos principais, campos do segmento), Preferências de Financeiro. A sessão caiu antes de Agenda, Clientes, Produtos/estoque, Outras configurações e Planos; esses módulos ficam para uma segunda rodada (com o dono logando de novo).

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

## Segunda rodada (pendente)
Agenda, Clientes, Produtos & estoque, Serviços, aba Gerenciar, Outras configurações (exportação, notificações, segurança) e Planos. Precisa que o dono logue de novo na conta de teste — não digitamos senha.
