# ADR-018 — Navegação após criar ou concluir orçamento

**Status:** Aceito
**Data:** 2026-10-12
**Relacionado:** B4-12 (decisão), B4-13 (implementação), B4-48 (semântica de PDF em rascunho)

## Contexto

Depois de criar ou concluir um orçamento, o usuário pode usar Voltar e reencontrar o formulário de criação ainda
editável. Isso dá a impressão de que o documento não foi registrado e facilita uma segunda geração acidental.

O comportamento atual não é uniforme:

| Superfície                     | Destino atual                | Histórico atual                                          | Resultado do levantamento                                                                |
| ------------------------------ | ---------------------------- | -------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Web completo, desktop e mobile | Detalhe em `/orcamentos/:id` | `router.push` mantém `/orcamentos/novo` atrás do detalhe | Bug reproduzido nos três viewports: Voltar reabre `Novo orçamento`                       |
| Web fácil, desktop e mobile    | Tela interna `done`          | `go('done')` mantém `q1 → q2 → q3` na pilha              | Bug reproduzido: Voltar retorna a `Revisar e enviar` com `Concluir orçamento` disponível |
| App completo                   | `QuoteDetail`                | `navigation.replace` remove `QuoteCreate`                | Defeito não reproduzido na leitura do fluxo; execução autenticada depende de B4-15/B4-16 |
| App fácil                      | `QuoteDone`                  | `reset` deixa apenas `EasyTabs → QuoteDone`              | Defeito não reproduzido na leitura do fluxo; execução autenticada depende de B4-15/B4-16 |

O detalhe é o único destino que representa o documento já persistido, expõe número e estado reais e pode oferecer
ações de envio, PDF, duplicação e edição deliberada. Home, lista ou um novo formulário escondem o resultado recém-criado;
uma tela `Pronto` separada duplica responsabilidade e ainda precisa resolver o histórico do formulário.

## Decisão

### 1. Destino canônico

Após criar, salvar como rascunho ou concluir/enviar um orçamento, todas as superfícies devem abrir o **detalhe somente
leitura do orçamento persistido**. O modo fácil mantém sua linguagem e shell, mas recebe uma apresentação de detalhe
equivalente; não deve trocar silenciosamente para o modo completo.

O detalhe mostra uma confirmação contextual, sem criar uma segunda etapa de edição:

- `Orçamento salvo como rascunho` quando apenas persistido;
- `Orçamento concluído` ou `Orçamento enviado` conforme a ação realmente confirmada pelo backend;
- número, cliente, total e estado retornados pelo backend;
- ações de compartilhar, visualizar e baixar PDF adequadas ao estado;
- `Editar` ou `Continuar editando` como ação explícita, nunca como efeito de Voltar;
- `Novo orçamento` como CTA explícito que inicia um rascunho local vazio.

A tela `Pronto` pode ser absorvida pelo detalhe. Não permanece como destino separado na pilha depois da B4-13.

### 2. Regra de histórico

- Criação nova: substituir/resetar a rota do formulário pelo detalhe.
- Voltar a partir do detalhe recém-criado: abrir a lista de orçamentos, nunca `novo`, `q1`, `q2` ou `q3`.
- Edição existente: depois de salvar, substituir o editor pelo detalhe do mesmo ID.
- Cancelar uma criação sem salvar: conservar o comportamento normal de Voltar, pois nenhum documento foi criado.
- `Novo orçamento`: limpar todo estado local do fluxo e então abrir a primeira etapa.
- Recarregar o detalhe ou abrir sua URL diretamente deve continuar seguro e somente leitura.

No web completo, B4-13 troca `router.push` por `router.replace` nas saídas que persistem um novo orçamento. No web
fácil, a navegação final deve resetar a pilha interna para `quotes → detalhe`, sincronizando o estado de histórico do
navegador para que `popstate` não restaure as etapas. Nos apps, preservar o uso de `replace/reset`, apontando o modo
fácil para o detalhe em vez de uma tela final isolada.

### 3. Falhas parciais e idempotência

Se a criação concluir, mas envio, assinatura ou compartilhamento falhar, o ID criado não pode ser descartado. A UI abre
o detalhe desse mesmo orçamento, mostra o estado real (`Rascunho` quando aplicável) e explica qual ação não terminou.
Uma nova tentativa atualiza/reenvia o mesmo ID; não cria outro documento.

Os controles de submissão permanecem desabilitados durante a requisição, e as chaves de idempotência existentes são
mantidas. A navegação só muda depois de uma resposta de persistência com ID válido.

### 4. Limites desta decisão

- B4-12 não altera código de produto.
- A permissão para baixar/enviar PDF de um rascunho é decidida e implementada na B4-48.
- A revisão de completude antes de gerar/enviar pertence à B4-21.
- A decisão não muda estados de domínio, billing, design system nem dados de produção.

## Alternativas descartadas

- **Lista de orçamentos:** segura para o histórico, mas esconde o resultado e as ações imediatas.
- **Home:** perde contexto e aumenta o esforço para conferir o documento criado.
- **Novo orçamento:** favorece duplicação e não confirma o que acabou de ser salvo.
- **Manter `Pronto` como destino canônico:** preserva ações de envio, mas duplica o detalhe e torna o histórico mais
  complexo entre modos.

## Critérios para B4-13

1. Criar/concluir em cada superfície termina no detalhe somente leitura do ID retornado.
2. Voltar abre a lista e nunca restaura um editor preenchido.
3. `Novo orçamento` abre estado vazio; `Editar` reabre conscientemente o ID existente.
4. Duplo clique, reenvio após resposta perdida e falha depois da criação não geram um segundo orçamento.
5. Os testes cobrem browser back, gesto/back nativo, refresh/deep link e os viewports `1440×900`, `390×844` e
   `360×800`, nos modos fácil e completo.
6. No app, a validação funcional autenticada ocorre somente depois de B4-15/B4-16.

## Consequências

**Positivas**

- Um único modelo mental: persistiu, então o usuário vê o documento persistido.
- Voltar deixa de ser uma ação implícita de edição ou duplicação.
- Erros parciais continuam recuperáveis pelo ID real.
- Modos e superfícies compartilham contrato de navegação, mantendo apresentação própria.

**Trade-offs**

- O modo fácil precisa de um detalhe somente leitura próprio ou de uma adaptação do detalhe existente.
- Ações hoje concentradas em `Pronto` precisam migrar para esse detalhe.
- O histórico interno do web fácil exige teste específico de `popstate`, além do teste de rota do Next.js.
