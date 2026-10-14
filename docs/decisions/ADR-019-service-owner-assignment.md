# ADR-019 — Responsável pelo serviço e atribuição opcional

**Status:** Aceito  
**Data:** 2026-10-14  
**Relacionado:** B4-19 (decisão), B4-20 (implementação), B4-29/B4-37 (terminologia configurável)

## Contexto

O Key User esperava poder indicar uma pessoa ao criar a ordem de serviço. O domínio já possui
`work_orders.assigned_to_user_id`, opcional e relacionado a `User`, mas as telas de criação não perguntam quem será
responsável e as consultas de OS não incluem a relação `assigned_to`. A web mantém ainda um tipo local chamado
`technician`, por isso mostra “Sem técnico atribuído” mesmo quando o identificador foi persistido.

O contrato compartilhado aceita `assigned_to_user_id` na criação e edição. O backend já valida que o usuário escolhido
é membro ativo da empresa corrente antes de persistir; isso preserva `company_id` sem duplicá-lo na atribuição. Há duas
lacunas adicionais: `WorkOrderUpdateSchema` não aceita `null` para remover uma atribuição, e o endpoint geral de membros
é administrativo, inadequado como fonte para um seletor disponível a qualquer membro que já pode criar uma OS.

“Técnico” não representa todos os nichos atendidos pelo Orcivo. Ao mesmo tempo, renomear agora o enum persistido
`MemberRole.TECNICO`, assinatura, landing e documentos misturaria esta entrega com a decisão estratégica de
posicionamento das B4-29/B4-37.

## Decisão

Esta ADR não implementa produto: ela define o contrato que será executado na B4-20.

### 1. Conceito e termos

- O conceito de domínio é **atribuição da OS a um membro ativo da empresa**.
- O identificador canônico permanece `assigned_to_user_id`; ele já é neutro, opcional e tenant-scoped pela OS.
- A relação e as respostas usam `assigned_to`, com `id` e `name`. Não criar um segundo campo
  `technician_user_id` nem persistir texto de profissão na OS.
- A interface usa **Responsável pelo serviço** no rótulo e **Responsável** em espaços curtos. O estado vazio é
  **Sem responsável**.
- `TECNICO` permanece apenas como código interno de papel até a decisão estratégica B4-29/B4-37. A atribuição não
  depende desse papel: OWNER, ADMIN ou TECNICO ativos podem ser responsáveis.

### 2. Regra de atribuição

- A atribuição é opcional na criação manual e na OS criada automaticamente após aprovação.
- Não selecionar uma pessoa persiste `null`; nunca atribuir silenciosamente ao criador, ao proprietário da empresa ou
  ao responsável do cliente.
- Qualquer membro ativo que hoje possa criar/editar uma OS pode escolher outro membro ativo da mesma empresa.
- O backend valida a empresa e o estado ativo no momento de atribuir. IDs de outra empresa, inexistentes ou inativos
  são rejeitados sem revelar dados do usuário.
- Uma pessoa desativada continua aparecendo no histórico e nas OS antigas, mas não aparece como opção nova. A OS pode
  ser reatribuída ou ficar sem responsável.
- Criação, reatribuição e remoção entram na auditoria com linguagem neutra e com IDs antes/depois nos metadados; não
  usar apenas texto livre.

### 3. Fonte segura para o seletor

B4-20 deve expor uma leitura mínima tenant-scoped para membros atribuíveis, reutilizando o guard de empresa e sem
relaxar o endpoint administrativo de equipe. A resposta contém somente o necessário para o seletor (`user_id`, `name`)
e lista membros ativos da empresa corrente em ordem estável. E-mail, limites, convites e permissões administrativas não
fazem parte desse contrato.

### 4. Momento da pergunta e edição

Na criação manual, o campo fica no mesmo formulário, depois dos dados do serviço e antes do agendamento. Ele começa em
“Sem responsável”, tem indicação “Opcional” e não abre modal obrigatório. Isso mantém o mínimo atual — cliente e título
— e permite decidir pessoa/data juntas sem interromper o fluxo.

Na OS automática após aprovação, a aprovação não ganha uma etapa nova e não fica bloqueada. A OS nasce pendente e sem
responsável; o detalhe mostra a ação contextual **Definir responsável**. A lista pode sinalizar “Sem responsável”, mas
não transforma a ausência em erro.

Enquanto a OS estiver aberta, o detalhe permite atribuir, reatribuir ou remover. Em OS encerrada, a mudança segue o
fluxo administrativo de correção já existente, com motivo obrigatório. `WorkOrderUpdateSchema` passa a aceitar
`assigned_to_user_id: null` para remoção consciente.

### 5. Superfícies e wireflow

| Superfície            | Criação manual                                                   | OS automática / detalhe                                 | Evidência do levantamento                                  |
| --------------------- | ---------------------------------------------------------------- | ------------------------------------------------------- | ---------------------------------------------------------- |
| Web desktop, completo | seletor opcional no formulário, antes do agendamento             | ação Definir/Alterar/Remover no detalhe                 | criação existe; hoje não envia `assigned_to_user_id`       |
| Web mobile, completo  | o mesmo campo ocupa uma linha inteira, sem grade estreita        | sheet ou seção do detalhe, com CTA contido              | mesmo componente da web desktop; aplicar 390×844 e 360×800 |
| Web desktop, fácil    | não há criação manual própria                                    | serviço vindo da aprovação; atribuição no detalhe fácil | criação direta não aplicável; lista/detalhe existem        |
| Web mobile, fácil     | não há criação manual própria                                    | mesmo detalhe fácil, sem trocar de modo                 | criação direta não aplicável; validar nos dois viewports   |
| App nativo, completo  | seletor opcional em `WorkOrderCreateScreen` antes do agendamento | ação no detalhe completo                                | criação existe; hoje não envia `assigned_to_user_id`       |
| App nativo, fácil     | não há criação manual própria                                    | serviço vindo da aprovação; atribuição no detalhe fácil | criação direta não aplicável; lista/detalhe existem        |

Os modos fáceis não devem redirecionar para uma tela completa para executar a atribuição. Onde a criação manual não
existe, “não aplicável” se refere somente à etapa de criação; o comportamento equivalente de atribuição continua
obrigatório no detalhe.

### 6. Documentos

A pessoa responsável pela execução não é necessariamente quem criou o orçamento nem quem assina um recibo. Portanto:

- orçamento e recibo atuais não passam a mostrar responsável automaticamente;
- assinatura salva/avulsa continua sendo um conceito separado;
- se B4-24/B4-27 aprovarem o campo em documentos, a geração usa o snapshot/nome explicitamente previsto pelo modelo
  documental e o rótulo neutro, sem inferir “Técnico” a partir do papel;
- uma futura personalização do termo pertence às B4-29/B4-37 e deve ter fallback “Responsável”.

## Alternativas descartadas

- **Atribuir automaticamente ao criador:** reduz um toque, mas registra uma responsabilidade possivelmente falsa e
  confunde empresas em que quem agenda não executa.
- **Restringir responsáveis ao papel TECNICO:** mantém a linguagem antiga, exclui proprietários/admins que também
  executam e prende o domínio a um nicho.
- **Usar o endpoint administrativo de equipe:** exporia mais dados/permissões do que o seletor precisa ou impediria
  membros não administrativos de usar uma ação que já podem executar.
- **Persistir um nome livre na OS:** perde vínculo, estado ativo, auditoria e integridade tenant-scoped.
- **Implementar termo configurável agora:** antecipa a decisão estratégica de posicionamento e onboarding.

## Critérios para B4-20

1. Backend/shared-types primeiro: leitura mínima de membros atribuíveis; criação/edição/remoção validadas por empresa;
   resposta de OS inclui `assigned_to`; auditoria usa linguagem neutra.
2. Specs cobrem membro ativo, `null`, inativo e ID de outra empresa, inclusive isolamento e OS automática sem
   atribuição.
3. Web completo e app completo perguntam opcionalmente na criação; todos os detalhes existentes permitem
   definir/alterar/remover sem trocar de modo.
4. Listas, filtros e detalhes substituem “técnico” por “responsável” somente no contexto de atribuição da OS. Papel de
   equipe, laudo e assinatura ficam para suas tarefas próprias.
5. A matriz visual cobre `1440×900`, `390×844` e `360×800`, fácil/completo; no app, os dois modos e teclado/safe area.
6. Nenhuma migration é necessária: reutilizar `assigned_to_user_id`; se surgir necessidade de novo dado, ele precisa
   de `company_id` e migration idempotente.

## Consequências

**Positivas**

- Reutiliza o vínculo existente e mantém a regra de empresa no backend.
- Permite planejar e reatribuir trabalho sem tornar a criação mais pesada.
- Remove “técnico” do conceito de execução sem antecipar a estratégia global de nomenclatura.
- Separa responsabilidade, papel de acesso e assinatura de documento.

**Trade-offs**

- É necessário um contrato mínimo adicional para popular o seletor com segurança.
- UIs e tipos locais que esperam `technician` precisam migrar em conjunto para `assigned_to`.
- OS antigas atribuídas a membros depois desativados exigem apresentação histórica distinta das opções selecionáveis.
