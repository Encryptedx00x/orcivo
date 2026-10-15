# Improvement Batch 4 — passada exploratória pré-deploy

Data: 2026-10-15  
HEAD validado: `4a60a0a`  
Ambiente: PostgreSQL, Redis e MinIO locais; backend `:3000`, web `:3001` e Expo web `:8081`. Produção não foi acessada.

## Verificação automática concluída

- shared-types: `17/17` suítes, `95/95` testes; build, typecheck e lint verdes.
- backend: `53/53` suítes, `567/567` testes executados e `5` TODOs preexistentes; execução serial com `--runInBand`; build, typecheck e lint verdes. O único aviso de lint é o `console` preexistente em `src/main.ts`.
- web: `25/25` arquivos `*.test.mjs` verdes; build Next de produção, typecheck e lint verdes. Permanecem somente os avisos preexistentes de `<img>`.
- mobile: `32/32` arquivos `*.test.mjs` verdes; typecheck e lint verdes. O script `build` informa corretamente que o artefato nativo exige EAS; guard de API distribuída e orçamento de tamanho passaram.
- health local: backend `200`, web `200` e Expo web `200` após estabilização.
- secret scan do delta do Batch 4: os únicos literais detectados são fixtures de teste de senha/token; nenhum segredo operacional foi adicionado.

## Defeito encontrado e corrigido

A suíte completa revelou que `quote.state-machine.spec.ts` ainda exigia o erro técnico `APPROVED → APPROVED`, embora a B4-01 tenha tornado a segunda aprovação idempotente e amigável. O contrato foi atualizado para exigir `already_approved`, a mensagem em pt-BR, o ID da OS existente e nenhuma nova escrita/auditoria. Correção: `4a60a0a`.

O primeiro build web encontrou `apps/web/.next/build-manifest.json` corrompido pela escrita concorrente do servidor de desenvolvimento e do build. O preview local foi pausado, somente o cache gerado `.next` foi removido após validar o caminho absoluto, o build de produção passou e o preview foi religado em `:3001`.

## Evidência visual disponível no mesmo HEAD funcional

As matrizes individuais B4-14A, B4-20, B4-21, B4-22, B4-25, B4-26 e B4-27 cobrem os três viewports web, os dois modos e o Expo web quando aplicável. Elas incluem duas sessões concorrentes, download real, atribuição, completude, assinatura, PDF e documentos sem overflow.

Essa evidência agregada não substitui a passada exploratória nova exigida pela B4-44.

## Pendente para fechar B4-44

- repetir, numa única passada fresca, cadastro → orçamento → aprovação → OS → recebimento → recibo;
- web fácil/completo em `1440×900`, `390×844` e `360×800`;
- app fácil/completo em build equivalente à produção;
- duas sessões na aprovação, download real e inspeção dos documentos finais;
- registrar resultado/prints e corrigir qualquer novo defeito antes de liberar `DEPLOY-B4-2`.

O controlador da aba integrada negou autoridade para observar a URL local por política de segurança e proibiu contornar o bloqueio por outra superfície de navegador. Por isso a matriz fresca não foi simulada nem declarada concluída. B4-44 e `DEPLOY-B4-2` permanecem bloqueados.
