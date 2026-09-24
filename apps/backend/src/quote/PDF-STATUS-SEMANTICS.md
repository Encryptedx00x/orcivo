# Semântica de status no PDF de orçamento (PB1-P12)

Dono da regra: `quote-pdf.service.tsx` (`QUOTE_PDF_STATUS_BADGE`) em conjunto
com `quote.service.ts` (pontos de geração). Estado e transições vêm SEMPRE da
máquina compartilhada `QUOTE_ACTIONS` (`@orcivo/shared-types`, ADR-016) — o
PDF nunca inventa estados.

## Princípio

> O selo impresso no PDF carimba o estado que era **verdadeiro no momento em
> que o documento foi gerado** — nunca um estado anterior ou posterior da
> máquina. O rótulo corresponde exatamente a esse estado.

Consequências:

- **AC2** — um PDF enviado nunca exibe `Rascunho`: `send()` carimba `SENT`.
- **AC3** — o rótulo reflete o estado no instante da geração: `approve()`
  regenera com `APPROVED`, e o preview sob demanda carimba o estado atual.
- O artefato enviado é **imutável**: ações que não regeneram o PDF
  (`recusar`, `cancelar`, `expirar`, `reabrir`, `corrigir`) deixam o selo do
  momento da geração — o documento é um registro histórico, não um
  espelho ao vivo do banco.

## Estados, rótulos e quando são carimbados

| Estado      | Rótulo    | Cor do selo                   | Quando um PDF é carimbado com este estado                      |
| ----------- | --------- | ----------------------------- | -------------------------------------------------------------- |
| `DRAFT`     | Rascunho  | slate (`#F1F5F9`/`#334155`)   | apenas preview sob demanda (`generatePdf`)                     |
| `SENT`      | Enviado   | info (`#E0F2FE`/`#075985`)    | `send()` — PDF anexado ao envio + preview de orçamento enviado |
| `APPROVED`  | Aprovado  | success (`#DCFCE7`/`#166534`) | `approve()` — regeneração pós-aprovação                        |
| `REJECTED`  | Recusado  | danger (`#FEE2E2`/`#991B1B`)  | apenas preview sob demanda de orçamento terminal               |
| `CANCELLED` | Cancelado | slate (`#F1F5F9`/`#64748B`)   | apenas preview sob demanda de orçamento terminal               |
| `EXPIRED`   | Expirado  | warning (`#FEF3C7`/`#92400E`) | apenas preview sob demanda de orçamento terminal               |

Rótulos idênticos aos das telas de detalhe (`OrcamentoDetail`, `DocumentosContent`,
mobile) — `docs/handoff/COMPONENTS.md`.

## Pontos de geração e o estado carimbado

| Ponto                        | Artefato                           | Estado carimbado                                               |
| ---------------------------- | ---------------------------------- | -------------------------------------------------------------- |
| `QuoteService.send()`        | PDF enviado ao cliente (`pdf_url`) | `enviar.to` → `SENT` (a máquina define; hoje `DRAFT → SENT`)   |
| `QuoteService.approve()`     | PDF regenerado pós-aprovação       | `aprovar.to` → `APPROVED` (geração ocorre DEPOIS da transição) |
| `QuoteService.generatePdf()` | preview sob demanda (não persiste) | estado atual do orçamento no instante da geração               |

Detalhes de implementação:

- O carimbo viaja no campo `QuoteData.status` (`QuoteStatus`, obrigatório) —
  o renderer não lê o banco, só carimba o que recebeu.
- `send()` gera o PDF **antes** da transação, mas o artefato só é persistido
  (`pdf_url`) na mesma transação que grava `SENT` — o carimbo e o estado
  persistido nunca divergem.
- `approve()` regenera **depois** de `APPROVED` já persistido — o carimbo
  reflete o estado real no instante da geração.
- `reabrir` (→ `SENT`) não regenera o PDF: o artefato conservado já carrega
  `Enviado` do envio original (reabrir só é permitido a partir de estados
  terminais, cujo PDF conservado é o do envio) — rótulo segue correto para a
  nova rodada. `corrigir` (→ `DRAFT`) devolve ao fluxo de edição; o próximo
  `send()` regenera com `SENT`.

## Testes que travam a semântica

- `quote-pdf.service.spec.ts` — `QUOTE_PDF_STATUS_BADGE` é total sobre
  `QuoteStatus`; rótulos por estado; `SENT` nunca carrega `Rascunho`.
- `quote.service.spec.ts` — `send()` carimba `SENT` mesmo partindo de um
  orçamento `DRAFT`; `approve()` regenera carimbando `APPROVED`;
  `generatePdf()` carimba o estado atual.
