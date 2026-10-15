# Improvement Batch 4 — passada exploratória pré-deploy

Data: 2026-10-15

HEAD funcional final: `36fea69`

Ambiente: PostgreSQL, Redis e MinIO locais; backend `:3000`, web `:3001` e Expo web `:8081`. Produção não foi acessada.

## Resultado

A B4-44 foi concluída. A passada criou o cliente local `Cliente B4-44 Final` e percorreu orçamento #2 → envio →
aprovação concorrente → OS #2 → A receber → baixa → recibo nº 0002. Nenhum dado de produção foi lido ou alterado.

- o rascunho exibiu `Ver prévia`/`Baixar prévia`; após o envio, exibiu `Ver PDF`/`Baixar PDF`;
- a revisão de completude informou a garantia opcional vazia e permitiu enviar conscientemente sem preenchê-la;
- duas abas abriram o mesmo link antes da resposta: a primeira aprovou e a segunda recebeu
  `Este orçamento já foi aprovado. A tela foi atualizada.`, sem transição técnica inválida;
- a aprovação criou uma única OS #2 em `Pendente`, com total de R$ 100,00 e sem responsável;
- as condições à vista geraram uma única cobrança de R$ 100,00 em `A receber`, vinculada ao orçamento e à OS;
- a baixa para `Recebido` zerou o pendente, atualizou o lucro e gerou o recibo nº 0002;
- web fácil, app fácil e app completo refletiram R$ 350,00 recebidos, R$ 0,00 a receber e o novo recibo;
- o clique real em `Baixar PDF` do recibo executou `GET /api/receipt?...&download=1` com status 200;
- o app autenticou de verdade contra o backend local nos dois modos; o guard de produção contra localhost e o
  perfil de API distribuída permaneceram verdes na suíte automatizada.

## Matriz visual

| Superfície  | Modo     | Viewport          | Resultado                                                      |
| ----------- | -------- | ----------------- | -------------------------------------------------------------- |
| web desktop | fácil    | 1440×900          | orçamento/lista contidos, sem overflow                         |
| web desktop | completo | 1440×900          | detalhe e ações do orçamento contidos, sem overflow            |
| web mobile  | fácil    | 390×844 e 360×800 | orçamento, financeiro e recibo legíveis, sem overflow          |
| web mobile  | completo | 390×844 e 360×800 | orçamento, OS, recebimento e recibo contidos, sem overflow     |
| app         | fácil    | 390×844 e 360×800 | orçamento e financeiro/recibo contidos; dados frescos visíveis |
| app         | completo | 390×844 e 360×800 | orçamento, OS pendente e recibo frescos visíveis, sem overflow |

Evidências: [`docs/qa/evidence/b4-44`](evidence/b4-44). Os arquivos cobrem os três viewports web, os dois modos,
ambos os modos do app, a segunda aprovação concorrente, a OS pendente e o recibo antes/depois da correção visual.

## Defeitos encontrados e corrigidos

1. A suíte completa encontrou o teste obsoleto que ainda exigia `APPROVED → APPROVED`. O contrato passou a exigir
   a resposta idempotente amigável, sem nova escrita/auditoria (`4a60a0a`).
2. O modal completo do recibo usava `maxHeight` no content box; com o padding, sua caixa ultrapassava a viewport e
   cortava parcialmente a última ação em 390×844. `box-sizing: border-box` passou a incluir o padding na altura e
   `overscroll-behavior: contain` manteve a rolagem interna. Medições após a correção:
   - 390×844: caixa `top=16`, `bottom=828`, inteiramente dentro da viewport e rolável;
   - 360×800: caixa `top=16`, `bottom=784`, inteiramente dentro da viewport e rolável;
   - 1440×900: caixa `top=114`, `bottom=786`, sem necessidade de rolagem.
     Correção e contrato: `36fea69`.

## Verificação automática

- shared-types: `17/17` suítes, `95/95` testes; build, typecheck e lint verdes.
- backend: `53/53` suítes, `567/567` testes executados e `5` TODOs preexistentes; execução serial com
  `--runInBand`; build, typecheck e lint verdes.
- web: `84/84` testes após a correção final; build de produção anterior no mesmo lote, typecheck e lint verdes.
  Permanecem somente avisos preexistentes de `<img>`.
- mobile: `32/32` arquivos `*.test.mjs`, typecheck e lint verdes; guard de API distribuída e orçamento de tamanho
  aprovados.
- health local: backend, web e Expo web responderam 200.
- secret scan do delta: nenhum segredo operacional adicionado.

## Gate

`DEPLOY-B4-2` está tecnicamente liberado pela B4-44, mas não foi executado. Deploy continua sendo ação separada e
condicionada à autorização aplicável. A próxima tarefa do DAG é o fechamento formal da B4-33 com as decisões do dono
já registradas nas ADRs 020–024.
