# Orcivo - Resultado P00-T08

> **Execucao:** 2026-07-21, America/Sao_Paulo
> **Candidato:** `C:\Users\Encryptedx\Desktop\orcivo-standalone-recovery`
> **P00-T08:** **PASS**
> **Recomendacao para commit imediato:** **NO-GO**
> **Cutover, commit, remote e push:** nao executados

O P00-T08 reproduziu e registrou o baseline local dos comandos permitidos. A instalacao congelada, os cinco typechecks, os cinco lints reais, 49 testes unitarios isolados, tres de quatro builds, Prisma Validate e Compose Config terminaram com exit code 0. O build web permanece vermelho por um requisito de `Suspense`; a tentativa de corrigi-lo foi revertida porque introduziria um estado visual transitivo fora desta autorizacao. O proprio P00 aceita baseline vermelho em gaps conhecidos. Reprodutibilidade de imagem, runtime Docker e fontes offline nao foi validada.

## 1. Ambiente

| Item | Valor |
|---|---|
| Sistema operacional | Windows NT `10.0.26200.0` |
| PowerShell | `5.1.26100.8875` |
| Node.js | `v24.11.1` |
| Corepack | `0.34.2` |
| pnpm | `9.15.0` |
| Docker CLI | `29.2.1` |
| Docker Compose | `v5.1.0` |
| Git top-level | `C:/Users/Encryptedx/Desktop/orcivo-standalone-recovery` |
| Branch | `main` |
| Commit | `1df213072068255cb11334f1d758ca950fa0ef45` |
| Commits | `161` |
| Remotes/upstream | nenhum |
| `git fsck --full` inicial | exit 0, sem saida |

O pre-flight confirmou zero arquivo staged, zero arquivo rastreado modificado, 145 paths nao rastreados exatamente iguais a allowlist e nenhum `.env` real. Somente nomes de arquivos de ambiente foram inspecionados; nenhum valor foi lido ou exibido.

## 2. Instalacao

Comandos:

```powershell
corepack pnpm --version
corepack pnpm install --frozen-lockfile
```

Resultado:

- PASS para os oito workspaces;
- lockfile reconhecido como atualizado, sem resolucao ou alteracao;
- primeira instalacao: 1.477 pacotes, 1.470 reutilizados e zero download;
- segunda verificacao, depois das correcoes de scripts: `Already up to date`;
- SHA-256 de `pnpm-lock.yaml` antes e depois: `4E5DEFAB19F0A0B1F230A1CBF9348FA565D47D7B6C743199176A3B72250F5979`;
- nenhum arquivo rastreado foi alterado pela instalacao;
- `node_modules`, artefatos de build e caches permaneceram ignorados.

Warnings nao bloqueantes:

- Node emitiu `DEP0169` para uso legado de `url.parse()` em dependencia transitiva;
- pnpm informou versao principal mais nova, sem atualizacao;
- Prisma informou versao principal mais nova, sem atualizacao;
- o script `prepare` do Husky criou `.husky/_` ignorado e definiu apenas no candidato `core.hooksPath=.husky/_`; nenhum remote, ref, indice ou historico foi alterado.

## 3. Matriz de validacoes

| Workspace | Typecheck | Lint | Test | Build | Resultado final |
|---|---|---|---|---|---|
| `packages/shared-types` | `tsc --noEmit` PASS | ESLint TS real PASS | 1 suite / 15 testes PASS | `tsc` PASS | PASS |
| `apps/backend` | `tsc --noEmit` PASS | PASS com 1 warning | 7 suites / 34 testes PASS | `nest build` PASS | PASS com warning |
| `apps/web` | `tsc --noEmit` PASS | PASS com 2 warnings | ausente | FAIL ao prerenderizar `/ordens-de-servico/novo` | FAIL de build |
| `apps/mobile` | `tsc --noEmit` PASS | ESLint TS PASS, zero warning | ausente | script e apenas placeholder; nao executado como build | PASS para validacao local permitida |
| `apps/site` | `tsc --noEmit` PASS | Next ESLint PASS | ausente | `next build` local nao-standalone PASS, 9 paginas | PASS local; standalone nao validado |

`apps/admin` e `packages/ui` possuem somente scripts placeholder. Eles nao foram apresentados como validacao real. O comando raiz de testes nao foi usado porque incluiria o `globalSetup` e suites proibidas do backend.

Warnings finais de lint:

- backend: `apps/backend/src/main.ts:15`, um `console` coberto por `no-console` como warning;
- web: `<img>` em `OrcamentoDetail.tsx:302` e `WorkOrderDetail.tsx:219`, regra `@next/next/no-img-element`;
- mobile, site e shared-types: zero warning.

## 4. Comandos executados

### Pre-flight e controle

```powershell
git rev-parse --show-toplevel
git branch --show-current
git rev-parse HEAD
git rev-list --count HEAD
git remote -v
git status --short --untracked-files=all
git fsck --full
git diff --check
git diff --stat
git ls-files --others --exclude-standard
Get-FileHash pnpm-lock.yaml -Algorithm SHA256
```

O seguinte trio foi repetido depois de instalacao, typecheck/lint, unidades, builds/Prisma/Compose e no gate final:

```powershell
git status --short --untracked-files=all
git diff --check
git diff --stat
```

Revalidacao fail-fast da allowlist:

```powershell
$Manifest = Import-Csv D:\OrcivoRecovery\orcivo-recovery-work-20260721-063354\approved-transport-final.csv
$Untracked = @(git ls-files --others --exclude-standard)
foreach ($Entry in $Manifest) {
  Test-Path -LiteralPath $Entry.RelativePath -PathType Leaf
  (Get-Item -LiteralPath $Entry.RelativePath).Length -eq [int64]$Entry.Length
  (Get-FileHash -LiteralPath $Entry.RelativePath -Algorithm SHA256).Hash -eq $Entry.SHA256
  $Untracked -contains ($Entry.RelativePath -replace '\\', '/')
}
```

Scan final, com saida limitada a paths/contagens:

```powershell
rg --files --hidden -g '.env*' -g '!node_modules/**' -g '!**/.next/**' -g '!**/dist/**' -g '!.git/**'
rg --hidden -l -P '(-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----|AKIA[0-9A-Z]{16}|gh[pousr]_[A-Za-z0-9]{36,}|sk_live_[A-Za-z0-9]{16,}|xox[baprs]-[A-Za-z0-9-]{16,}|AIza[0-9A-Za-z_-]{30,})' . -g '!node_modules/**' -g '!**/.next/**' -g '!**/dist/**' -g '!.git/**'
```

### Geracao local revisada

O gerador Prisma foi inspecionado antes da execucao. O schema tem somente o gerador padrao `prisma-client-js`, sem hook adicional. Foi usada URL dummy no processo e nenhuma conexao foi aberta.

```powershell
$env:DATABASE_URL='postgresql://invalid:invalid@127.0.0.1:1/orcivo_validate_only'
corepack pnpm exec prisma generate --schema prisma/schema.prisma
corepack pnpm --filter @orcivo/shared-types build
```

### Typecheck

```powershell
corepack pnpm --filter @orcivo/shared-types typecheck
corepack pnpm --filter @orcivo/backend typecheck
corepack pnpm --filter @orcivo/web typecheck
corepack pnpm --filter @orcivo/mobile typecheck
corepack pnpm --filter @orcivo/site typecheck
```

### Lint sem autofix

```powershell
corepack pnpm --filter @orcivo/shared-types lint
corepack pnpm --filter @orcivo/backend lint
corepack pnpm --filter @orcivo/web lint
corepack pnpm --filter @orcivo/mobile lint
corepack pnpm --filter @orcivo/site lint
```

### Testes unitarios isolados

```powershell
corepack pnpm --filter @orcivo/shared-types exec jest --runInBand --no-cache

Push-Location apps/backend
corepack pnpm exec jest --config jest.unit-safe.config.cjs --runInBand --no-cache `
  --runTestsByPath `
  src/auth/auth.service.spec.ts `
  src/auth/guards/jwt-auth.guard.spec.ts `
  src/auth/guards/tenant.guard.spec.ts `
  src/company/company.service.spec.ts `
  src/customer/customer.service.spec.ts `
  src/quote/quote-pdf.service.spec.ts `
  src/quote/quote.service.spec.ts
Pop-Location
```

### Builds

```powershell
corepack pnpm --filter @orcivo/shared-types build
corepack pnpm --filter @orcivo/backend build
corepack pnpm --filter @orcivo/web build
corepack pnpm --filter @orcivo/site build
corepack pnpm --filter @orcivo/backend exec node -e "const m=require('@orcivo/shared-types'); console.log(typeof m==='object')"
```

### Prisma e Compose

```powershell
$env:DATABASE_URL='postgresql://invalid:invalid@127.0.0.1:1/orcivo_validate_only'
corepack pnpm exec prisma validate --schema prisma/schema.prisma
docker compose -f infra/docker-compose.dev.yml config --quiet
```

Nao foram usados `npx`, `npm install`, `--force`, `--fix` global, Prettier write, migration, `db push`, seed, reset, cleanup, banco, container, EAS, deploy ou servico externo real.

## 5. Erros encontrados inicialmente

| Workspace | Arquivo/linha ou escopo | Erro | Causa provavel |
|---|---|---|---|
| backend, web e mobile | imports de `@orcivo/shared-types` em 36 ocorrencias de fonte | TypeScript nao resolvia o pacote | `packages/shared-types/dist` ainda nao existia no checkout recuperado |
| backend | `src/billing/subscription.service.ts:3` | exports Prisma ausentes no cliente local | Prisma Client ainda nao havia sido gerado a partir do schema recuperado |
| mobile | `src/navigation/AppTabs.tsx:31` | componente `QuoteDetail` incompativel com stack sem tipo | stack criada sem `ParamList` |
| mobile | `src/screens/auth/SignupStep2Screen.tsx` | imports `View` e `api` nao usados | codigo morto |
| mobile | `src/screens/clientes/ClienteCreateScreen.tsx` | import `View` nao usado | codigo morto |
| backend lint | 16 specs/helpers | parser recusava arquivos fora do projeto TS | ESLint apontava para `tsconfig.json`, que exclui specs |
| backend lint | `src/billing/subscription.service.ts:128` | `prefer-const` | binding nao era reatribuido |
| backend lint | `src/invite/invite.controller.ts:28` | `no-explicit-any` | request publico era convertido para `any` |
| backend lint | duas specs de quote, 13 ocorrencias | `no-explicit-any` em mocks | regra de producao aplicada a doubles de teste |
| web lint | `FinanceiroContent.tsx:144` e `AuthArtPanel.tsx:93` | quatro `react/no-unescaped-entities` | aspas literais em JSX |
| web lint | duas telas de detalhe | dois warnings `no-img-element` | imagens renderizadas por URL direta |
| mobile lint | 28 arquivos | parsing error em imports TS | workspace sem parser/configuracao ESLint TypeScript |
| mobile lint | 13 arquivos, 24 ocorrencias | `no-explicit-any` | props de navegacao, respostas e erros sem tipo |
| site lint | 8 parsing errors e plugin Next ausente | config ESLint local inexistente | o script existia, mas o workspace nao tinha configuracao |
| shared-types lint | script retornava texto fixo | falso positivo de qualidade | `lint` era placeholder `echo` |
| backend unit config | scan inicial apos hardening | mock manual duplicado em `src` e `dist` | Jest ainda indexava artefato compilado ignorado |
| web build | `/ordens-de-servico/novo` | `useSearchParams()` sem Suspense | requisito de prerender do Next 14 |
| web build | fase de tracing standalone | `EPERM` ao criar symlink | Windows sem privilegio de symlink para o tracer standalone |

### 5.1 Inventario detalhado dos erros

Os 36 erros de resolucao tinham a mesma mensagem `TS2307/TS7016: Cannot find module '@orcivo/shared-types' or its corresponding type declarations` nestes pontos:

```text
apps/backend/src/auth/auth.controller.ts:19
apps/backend/src/auth/auth.service.ts:4
apps/backend/src/catalog/catalog.controller.ts:14
apps/backend/src/catalog/catalog.service.ts:2
apps/backend/src/customer/customer.controller.ts:2
apps/backend/src/customer/customer.service.ts:2
apps/backend/src/plan-limits/check-plan-limit.decorator.ts:2
apps/backend/src/plan-limits/plan-limits.service.ts:2
apps/backend/src/quote/quote.controller.ts:18
apps/backend/src/quote/quote.service.ts:6
apps/backend/src/quote/quote-pdf.service.tsx:17
apps/backend/src/quote/quote-public.controller.ts:3
apps/backend/src/work-order/work-order.controller.ts:18
apps/backend/src/work-order/work-order.service.ts:2
apps/mobile/src/screens/auth/SignupStep1Screen.tsx:3
apps/mobile/src/screens/auth/SignupStep2Screen.tsx:3
apps/mobile/src/screens/CatalogScreen.tsx:11
apps/mobile/src/screens/clientes/ClienteCreateScreen.tsx:3
apps/mobile/src/screens/QuoteCreateScreen.tsx:19
apps/mobile/src/screens/QuoteDetailScreen.tsx:14
apps/mobile/src/screens/QuoteListScreen.tsx:11
apps/mobile/src/services/catalog.service.ts:2
apps/web/app/(app)/catalogo/actions.ts:5
apps/web/app/(app)/catalogo/CatalogoContent.tsx:5
apps/web/app/(app)/clientes/[id]/editar/page.tsx:7
apps/web/app/(app)/clientes/novo/page.tsx:6
apps/web/app/(app)/dashboard/page.tsx:3
apps/web/app/(app)/financeiro/page.tsx:1
apps/web/app/(app)/orcamentos/[id]/OrcamentoDetail.tsx:6
apps/web/app/(app)/orcamentos/novo/NovoOrcamentoForm.tsx:7
apps/web/app/(app)/orcamentos/OrcamentosContent.tsx:5
apps/web/app/(app)/ordens-de-servico/novo/page.tsx:7
apps/web/app/(app)/plano/page.tsx:2
apps/web/app/approve/[token]/page.tsx:6
apps/web/lib/catalog.service.ts:2
apps/web/lib/quote.service.ts:2
```

Erros TypeScript adicionais:

| Workspace | Arquivo:linha | Mensagem |
|---|---|---|
| backend | `src/billing/subscription.service.ts:3` | `TS2305`: cliente Prisma local nao exportava `PlanCode` e `SubscriptionStatus` |
| mobile | `src/navigation/AppTabs.tsx:31` | `TS2322`: props de `QuoteDetailScreen` incompativeis com stack sem ParamList |
| mobile | `src/screens/auth/SignupStep2Screen.tsx:2,6` | `TS6133`: `View` e `api` declarados e nao usados |
| mobile | `src/screens/clientes/ClienteCreateScreen.tsx:2` | `TS6133`: `View` declarado e nao usado |

Os 16 parser errors do backend tinham a mesma mensagem de `parserOptions.project`: arquivo nao incluido pelo `tsconfig.json`. Foram emitidos em `0:0` para:

```text
src/auth/auth.e2e.spec.ts
src/auth/auth.service.spec.ts
src/auth/guards/jwt-auth.guard.spec.ts
src/auth/guards/tenant.guard.spec.ts
src/catalog/catalog.isolation.spec.ts
src/company/company.service.spec.ts
src/customer/customer.e2e.spec.ts
src/customer/customer.isolation.spec.ts
src/customer/customer.service.spec.ts
src/quote/quote.isolation.spec.ts
src/quote/quote.service.spec.ts
src/quote/quote-pdf.service.spec.ts
src/work-order/work-order.isolation.spec.ts
test/billing.e2e-spec.ts
test/globalSetup.ts
test/setup.ts
```

As 13 ocorrencias `no-explicit-any` permitidas somente em mocks estavam em `quote-pdf.service.spec.ts:4,5,6,7,9,10,11,14` e `quote.isolation.spec.ts:4,5,6,7,9`.

As 24 ocorrencias `no-explicit-any` do mobile estavam em:

```text
navigation/MaisStack.tsx:25:55, 48:83, 55:30
screens/CatalogItemFormScreen.tsx:17:15, 70:19
screens/CatalogScreen.tsx:15:15
screens/QuoteCreateScreen.tsx:25:15, 181:19
screens/QuoteListScreen.tsx:15:15
screens/WorkOrderDetailScreen.tsx:16:15, 17:10
screens/WorkOrderListScreen.tsx:14:15
screens/WorkOrderPhotoScreen.tsx:20:15, 21:10
screens/auth/LoginScreen.tsx:6:59, 17:17
screens/auth/SignupStep1Screen.tsx:6:65, 20:17
screens/auth/SignupStep2Screen.tsx:7:55, 32:93, 32:107, 41:17
screens/clientes/ClienteCreateScreen.tsx:6:67
screens/clientes/ClientesScreen.tsx:8:62
```

Antes das configs locais, o mobile emitiu parser error nos 27 arquivos de `apps/mobile/src` e em `apps/mobile/App.tsx`; o site emitiu o mesmo erro nos oito arquivos `apps/site/app/**/*.tsx`. A mensagem era `Parsing error: The keyword 'import' is reserved`, causada pelo parser JavaScript raiz aplicado a TypeScript.

Tentativas instrumentais sem efeito:

- a primeira configuracao Jest passada como JSON inline foi recusada pelo parser de argumentos do Windows; zero suite foi executada nessa tentativa;
- uma inspecao Node tentou importar `@orcivo/shared-types/package.json`, subpath corretamente bloqueado por `exports`; a verificacao corrigida importou somente o pacote e passou;
- uma expressao PowerShell de `git check-ignore` teve erro sintatico antes de executar; a forma corrigida passou.

## 6. Correcoes feitas

| Arquivo/grupo | Problema | Correcao | Risco |
|---|---|---|---|
| backend ESLint e package script | lint mutante e specs fora do projeto | removido `--fix`, criado `tsconfig.eslint.json` e override apenas para mocks/specs | baixo, somente tooling |
| backend unit config | Jest padrao carrega ambiente e suites proibidas | criada configuracao sem `globalSetup`, com `roots` em `src`, `testMatch` allowlist e caminhos CLI explicitos | baixo, somente teste |
| backend subscription/invite | `prefer-const` e cast `any` | binding `const` e request publico com `user` opcional tipado | baixo, sem mudanca de contrato/runtime |
| mobile ESLint | parser ausente | criada configuracao TypeScript local | baixo, somente tooling |
| mobile navegacao | stacks e screens com `any` | ParamLists e `NativeStackScreenProps` para auth, clientes, quotes e Mais | baixo, tipos apagados no runtime |
| mobile auth/erros | payloads e catches com `any` | tipos existentes de usuario/empresa e casts estruturais a partir de `unknown` | baixo, sem alterar mensagens ou fluxo |
| web JSX | aspas invalidas para lint | entidades `&quot;` | baixo, mesmo texto renderizado |
| web/site Next config | standalone falhava no Windows | `standalone` permanece em Linux/Docker e e omitido somente neste ambiente Windows sem privilegio de symlink | baixo, compatibilidade de build local; artefato standalone nao validado |
| site ESLint | config ausente | configuracao `next/core-web-vitals` | baixo, somente tooling |
| shared-types lint | placeholder | script ESLint real e config TypeScript | baixo, somente tooling |

### 6.1 Manifesto path a path

| Arquivo | Problema | Correcao | Risco |
|---|---|---|---|
| `apps/backend/.eslintrc.json` | projeto TS excluia specs | projeto ESLint dedicado e override de mocks | baixo |
| `apps/backend/package.json` | lint usava `--fix` | lint passou a ser somente leitura | baixo |
| `apps/backend/src/billing/subscription.service.ts` | `prefer-const` | `let` para `const` | baixo |
| `apps/backend/src/invite/invite.controller.ts` | cast `any` | request publico com usuario opcional | baixo |
| `apps/backend/jest.unit-safe.config.cjs` | config padrao nao era isolada | roots em `src` e allowlist de 7 suites | baixo |
| `apps/backend/tsconfig.eslint.json` | specs fora do parser project | include de `src` e `test` apenas para lint | baixo |
| `apps/mobile/.eslintrc.json` | parser TS ausente | config TS recomendada | baixo |
| `apps/mobile/src/contexts/AuthContext.tsx` | tipos de sessao nao reutilizaveis | interfaces exportadas | baixo, type-only |
| `apps/mobile/src/navigation/AppTabs.tsx` | stacks sem ParamList | tipos de clientes e quotes | baixo, type-only |
| `apps/mobile/src/navigation/AuthStack.tsx` | stack sem ParamList | tipos de login/signup | baixo, type-only |
| `apps/mobile/src/navigation/MaisStack.tsx` | navegacao dinamica com `any` | ParamList e branch equivalente tipado | baixo, codigo executavel equivalente |
| `apps/mobile/src/screens/CatalogItemFormScreen.tsx` | props/catch com `any` | props nativas e erro `unknown` com fallback nulo | baixo |
| `apps/mobile/src/screens/CatalogScreen.tsx` | navigation com `any` | props nativas | baixo, type-only |
| `apps/mobile/src/screens/QuoteCreateScreen.tsx` | props/catch com `any` | props nativas e erro `unknown` com fallback nulo | baixo |
| `apps/mobile/src/screens/QuoteDetailScreen.tsx` | navigation com `any` | props nativas | baixo, type-only |
| `apps/mobile/src/screens/QuoteListScreen.tsx` | navigation com `any` | props nativas | baixo, type-only |
| `apps/mobile/src/screens/WorkOrderDetailScreen.tsx` | route/navigation com `any` | props nativas | baixo, type-only |
| `apps/mobile/src/screens/WorkOrderListScreen.tsx` | navigation com `any` | props nativas | baixo, type-only |
| `apps/mobile/src/screens/WorkOrderPhotoScreen.tsx` | route/navigation com `any` | props nativas | baixo, type-only |
| `apps/mobile/src/screens/auth/LoginScreen.tsx` | props/catch com `any` | props nativas e erro `unknown` com fallback nulo | baixo |
| `apps/mobile/src/screens/auth/SignupStep1Screen.tsx` | props/catch com `any` | props nativas e erro `unknown` com fallback nulo | baixo |
| `apps/mobile/src/screens/auth/SignupStep2Screen.tsx` | props/payload/catch com `any` e imports mortos | tipos de auth existentes e imports removidos | baixo |
| `apps/mobile/src/screens/clientes/ClienteCreateScreen.tsx` | navigation com `any` e import morto | props nativas e import removido | baixo |
| `apps/mobile/src/screens/clientes/ClientesScreen.tsx` | navigation com `any` | props nativas | baixo, type-only |
| `apps/site/.eslintrc.json` | lint sem config | config Next local | baixo |
| `apps/site/next.config.ts` | tracer standalone exige symlink | omissao de standalone somente no Windows | moderado, output local diferente |
| `apps/web/app/(app)/financeiro/FinanceiroContent.tsx` | aspas JSX | `&quot;` | baixo, texto igual |
| `apps/web/components/AuthArtPanel.tsx` | aspas JSX | `&quot;` | baixo, texto igual |
| `apps/web/next.config.mjs` | tracer standalone exige symlink | omissao de standalone somente no Windows | moderado, output local diferente |
| `packages/shared-types/.eslintrc.json` | lint TS sem config | config TS recomendada | baixo |
| `packages/shared-types/package.json` | lint placeholder | comando ESLint real | baixo |
| `docs/GIT_RECOVERY_P00_T08_RESULT.md` | resultado ausente | registro auditavel do P00-T08 | baixo, documentacao |

Nao houve alteracao de regra de negocio, endpoint, migration, schema, dependencia ou lockfile. A tentativa de `Suspense fallback={null}` foi revertida e nenhuma mudanca visual intencional permaneceu. As mudancas de navegacao mobile preservam os mesmos destinos, mas sao codigo executavel e exigem revisao humana do diff antes de commit.

## 7. Resultados finais

- frozen install: PASS;
- typecheck: 5/5 PASS;
- lint real: 5/5 exit 0;
- testes unitarios seguros: 8/8 suites e 49/49 testes PASS;
- builds locais: shared-types, backend e site PASS; web FAIL no prerender;
- mobile: typecheck e lint PASS; nenhum build remoto/local ficticio foi aceito como evidencia;
- Prisma schema: valido;
- Compose dev: config valido;
- carregamento local de `@orcivo/shared-types` no contexto do backend: PASS;
- nenhum teste acessou banco, `.env.test`, Redis, MinIO, e-mail ou Asaas real.

## 8. Testes nao executados

| Grupo | Quantidade | Motivo |
|---|---:|---|
| isolation backend | 4 suites / 14 testes | usam Prisma, criam dados e executam `deleteMany` |
| billing E2E | 1 suite / 3 testes | inicializa `AppModule`, banco e fronteiras externas |
| stubs E2E | 2 suites / 5 `it.todo` | nao executam assertivas e nao agregam evidencia |
| Jest backend padrao | - | `globalSetup` carrega `.env.test` e inclui suites proibidas |
| web/mobile/site | 0 suites existentes | workspaces nao definem testes unitarios |
| integracao/E2E | todos | proibidos nesta aprovacao |
| imagem Docker | nao executada | P00-T08 nao exige imagem; Dockerfile e contexto possuem gaps reservados a Wave 1 |
| mobile EAS/APK/Expo | nao executado | login externo, publicacao e dispositivo estao fora do escopo |

## 9. Estado do working tree

Estado imediatamente antes da inclusao deste relatorio:

| Classe | Quantidade | Observacao |
|---|---:|---|
| arquivos rastreados modificados intencionalmente | 26 | tooling, tipos e compatibilidade de build |
| novos arquivos de tooling intencionais | 5 | ESLint, TS ESLint e Jest seguro |
| allowlist original nao rastreada | 145 | intacta e ainda nao rastreada |
| arquivo gerado fora da allowlist | 1 | `apps/site/next-env.d.ts` |
| staged | 0 | nenhum `git add` executado |

Apos criar este relatorio, o total esperado e 26 rastreados modificados e 152 nao rastreados: 145 allowlist, 5 configs P00-T08, este relatorio e `apps/site/next-env.d.ts` gerado. Os 145 arquivos da allowlist foram revalidados: zero ausente, zero path deixou de ser nao rastreado, zero divergencia de tamanho e zero divergencia SHA-256.

## 10. Quantidade de arquivos modificados

- 26 arquivos historicos modificados;
- 5 novos arquivos de configuracao intencionais;
- 1 novo relatorio intencional;
- 1 arquivo Next gerado, nao intencional para commit;
- 32 paths intencionalmente tocados pelo P00-T08, contando este relatorio;
- 145 paths recuperados preservados sem alteracao.

O futuro staging nao deve usar `git add -A`. A allowlist documental e as 32 mudancas P00-T08 precisam de revisao e escopos de commit separados; nao devem ser fundidas implicitamente em um unico commit `docs:`. `apps/site/next-env.d.ts` deve ficar fora ate decisao humana sobre versiona-lo.

## 11. Allowlist nao rastreada

| Gate | Resultado |
|---|---:|
| entradas no manifesto | 145 |
| presentes no candidato | 145 |
| ainda nao rastreadas | 145 |
| divergencias de tamanho | 0 |
| divergencias SHA-256 | 0 |
| staged | 0 |

## 12. Gates finais

| Gate | Resultado |
|---|---|
| `git diff --check` | PASS, exit 0 |
| `git fsck --full` | PASS, exit 0, sem saida |
| Prisma Validate | PASS com URL dummy, sem conexao |
| Compose Config | PASS, exit 0, nenhum container iniciado |
| build web | FAIL em `/ordens-de-servico/novo`, `useSearchParams` sem `Suspense` |
| build standalone Linux/Docker | nao validado |
| lockfile | SHA-256 inalterado |
| `.env` real | 0 |
| arquivos `.env*.example` | 5, somente exemplos |
| suspeitas estritas de secret | 0 paths |
| remote/upstream | 0 |
| commits/branch/HEAD | 161 / `main` / `1df2130...` |

`git diff --check` emitiu apenas avisos informativos do Git sobre futura conversao LF/CRLF no checkout Windows; nao encontrou whitespace error.

## 13. Pendencias restantes

### Wave 0 / antes do commit

1. Revisao humana do diff dos 32 paths intencionais do P00-T08.
2. Decisao humana sobre excluir ou versionar `apps/site/next-env.d.ts`; ele foi regenerado pelo Next e nao pertence a allowlist aprovada.
3. Geracao de manifests de staging separados e verificaveis para recuperacao documental e correcoes P00-T08; o manifesto de 145 entradas nao cobre as correcoes.
4. P00-T09 continua bloqueado por aprovacao humana. Nenhum commit foi feito.

### Wave 1, nao corrigido aqui

1. Dockerfile backend nao copia `prisma/schema.prisma` nem executa `prisma generate` na imagem.
2. Runtime backend copia `packages/shared-types/src`, embora o pacote exporte `dist`.
3. Dockerfile web nao constroi explicitamente shared-types antes do build e depende do layout standalone.
4. Nao existe `.dockerignore`; um build futuro deve bloquear `.git`, `node_modules`, builds, caches e qualquer `.env` real no contexto.
5. Site usa `next/font/google`, portanto o build pode depender de rede para Inter.
6. Web importa Google Fonts em runtime; a aplicacao cliente depende de rede para Inter/JetBrains Mono.
7. Fontes nao foram vendorizadas porque isso exigiria tratar ativos visuais fora desta aprovacao.
8. Imagem Docker nao foi construida; o CLI estava disponivel, mas os gaps estaticos e o limite da Wave 0 tornam o resultado nao representativo.

### Divida nao bloqueante do baseline

1. Um warning `no-console` no backend.
2. Dois warnings `no-img-element` no web.
3. `apps/admin` e `packages/ui` ainda usam scripts placeholder.
4. O Node atual e v24, enquanto as imagens Docker declaram Node 20; a matriz oficial de runtime deve ser reconciliada na Wave 1.
5. Lint de mobile, site e shared-types depende de ESLint/parser/config hoisted por outros workspaces; instalacao filtrada nao foi comprovada e as dependencias explicitas exigiriam mudanca de lockfile.

## 14. Recomendacao

**P00-T08 PASS como execucao e registro do baseline. NO-GO para commit imediato.** Antes de uma nova aprovacao P00-T09:

1. nao usar apenas a allowlist antiga nem `git add -A`;
2. revisar os 32 paths intencionais e separar o commit documental de recuperacao das correcoes de tooling/tipos;
3. excluir `apps/site/next-env.d.ts` do staging, salvo decisao humana explicita em contrario;
4. decidir se o build web vermelho e aceitavel como baseline conhecido ou autorizar em fase apropriada o boundary/loading state;
5. repetir scan de secrets, `git diff --cached --check`, typechecks, lints, 49 unidades seguras e `git fsck --full` sobre cada estado exato a commitar;
6. manter Docker/fontes como gaps formais da Wave 1, sem declarar imagem reproduzivel nesta Wave 0.

Esta recomendacao nao autoriza commit, remote, push, cutover, rename ou Wave 1.
