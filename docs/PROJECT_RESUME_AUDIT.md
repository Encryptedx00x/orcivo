# Orcivo — Auditoria de Retomada

Data da auditoria: 20/07/2026
Escopo: reconstrução estática do repositório, planejamento GSD, histórico, banco, ambiente, validações seguras e fidelidade visual.
Restrições respeitadas: nenhum código, configuração, migration ou estado GSD foi alterado; nenhuma migration, seed, integração destrutiva, commit, push ou deploy foi executado; arquivos `.env` reais não foram lidos.

## 1. Resumo executivo

1. O diretório `orcivo` não possui um repositório Git próprio funcional: `orcivo/.git` existe vazio, e o Git efetivo é o repositório pai `C:\Users\Encryptedx`.
2. A branch efetiva é `gsd/phase-1`, no commit `419d00d` de 07/06/2026, sem remote ou upstream configurado; não é possível provar sincronização com `origin`.
3. O código Orcivo está limpo entre arquivos rastreados, mas há 140 arquivos não rastreados e 31 grupos ignorados; planejamento, handoff visual e documentos mestres relevantes estão fora do histórico.
4. Nenhuma fase possui encerramento humano integral demonstrável. A Fase 2A é a última com verificação programática completa (`12/12`), ainda marcada `human_needed`.
5. A última fase executada em código é a Fase 3; seus 9 planos não possuem `SUMMARY.md`, `VERIFICATION.md` nem resultado de UAT.
6. Há implementação posterior e não planejada de parte da Fase 2B: Dashboard, Recebimentos e Agenda foram adicionados em 07/06/2026.
7. `ROADMAP.md`, `STATE.md`, checkpoints, UAT e o código real se contradizem; os percentuais de 100% e as alegações de fidelidade/conclusão não são sustentáveis.
8. Auth e o núcleo de clientes, catálogo, orçamentos, PDF, aprovação pública e OS existem, mas possuem lacunas funcionais, de autorização, atomicidade e UAT.
9. `Payment` e `Appointment` existem no schema e no código, mas não têm migration versionada; uma base limpa não terá as tabelas necessárias.
10. Foram identificados 9 grupos bloqueantes, incluindo isolamento de tenant, objetos MinIO públicos, webhook fail-open, aprovação não atômica e imagem Docker não reproduzível.
11. O checklist humano consolidado contém 54 verificações abertas; nenhum resultado preenchido foi encontrado.
12. As validações locais ficaram vermelhas em typecheck mobile, lint e builds web/site; 8 suites unitárias seguras passaram, totalizando 49 testes.
13. A fidelidade visual web é majoritariamente parcial; no mobile, várias áreas são MVP genérico ou ausentes. Responsividade e estados de erro/loading não estão implementados de forma sistemática.
14. O projeto não deve iniciar uma próxima fase antes de um ciclo único de estabilização, migration, segurança, validação e UAT da fronteira atual.

## 2. Estado do Git

### Situação confirmada

| Item | Estado real |
|---|---|
| Diretório auditado | `C:\Users\Encryptedx\Desktop\orcivo` |
| Git local do diretório | `orcivo/.git` existe, mas está vazio e não forma um repositório válido |
| Git efetivamente usado | Repositório pai `C:\Users\Encryptedx` |
| Branch | `gsd/phase-1` |
| HEAD | `419d00df1833efd6f0625f389197f00cee105bc8` |
| Branch base local | `master` em `c602cff53e39d905557789e8541039eaccb3b726` |
| Comparação local | `gsd/phase-1` está 131 commits à frente e 0 atrás de `master` |
| Remote/upstream | Nenhum remote e nenhum upstream configurados |
| Comparação com `origin` | Impossível: `origin` não existe neste Git efetivo |
| Commits locais não enviados | Não demonstrável sem remote; existem 131 commits apenas na branch em relação ao `master` local |
| Estado rastreado no escopo Orcivo | 0 arquivos rastreados modificados |
| Não rastreados | 140 arquivos |
| Ignorados | 31 grupos, incluindo dependências, builds, caches e arquivos locais de ambiente; valores não foram lidos |

Não rastreados relevantes: os três documentos mestres exigidos por esta auditoria, `docs/design-handoff/orcivo-design-system/`, `docs/handoff/`, `docs/screens/`, `docs/ui_kits/`, `docs/runbooks/phase-2a-design-fidelity-audit.md`, `.planning/phases/03-monetizacao/03-UI-REVIEW.md`, `apps/site/next-env.d.ts` e arquivos auxiliares de autonomia. Isso impede reproduzir, somente pelo histórico, parte das decisões e referências usadas pelo código atual.

### Últimos 30 commits no escopo Orcivo

| Data | Commit | Mensagem |
|---|---|---|
| 07/06/2026 | `419d00d` | docs: guia de teste manual passo a passo (12 áreas, com o que validar) |
| 07/06/2026 | `5c97fe0` | docs: auditoria atualizada com features desenvolvidas + checklist manual |
| 07/06/2026 | `93f7d04` | feat: plano e equipe com dados reais + correções de billing/membros |
| 07/06/2026 | `1a9f275` | feat(web): dashboard, financeiro e agenda com dados reais |
| 07/06/2026 | `94ede52` | feat(backend): módulos Recebimentos, Compromissos e Dashboard |
| 07/06/2026 | `5d9a739` | design(login): painel esquerdo proporcional + auditoria funcional/design |
| 07/06/2026 | `c610874` | test(backend): corrige regressão de fontes no PDF e desbloqueia specs ESM |
| 07/06/2026 | `5cbf740` | fix(web): remove placeholder Hello World da Fase 0 no root |
| 07/06/2026 | `dfe27a8` | design(pdf): orçamento fiel ao handoff (Inter + JetBrains Mono embutidas) |
| 07/06/2026 | `f7887c4` | fix(web): links reais de Termos e Privacidade no signup |
| 07/06/2026 | `7ac6f86` | feat(site): landing reformulada — conversão, CTAs e animações |
| 07/06/2026 | `7d294da` | design(pdf): orçamento alinhado ao design system |
| 07/06/2026 | `a9509a1` | feat(web): documentos e financeiro com dados reais |
| 07/06/2026 | `2ec6694` | feat(quotes): endpoint de PDF sob demanda + botões do orçamento funcionais |
| 05/06/2026 | `54a3615` | fix(site): encoding UTF-8; fix(web): ambiente local de API |
| 05/06/2026 | `35e0f90` | chore(planning): STATE.md atualizado — web UI 100% fidelizada, cobertura de 24 telas |
| 05/06/2026 | `b8486f7` | feat(web): plano, equipe, financeiro e configuração |
| 05/06/2026 | `164bd46` | fix(web): fidelidade de topbar, OS, configuração e documentos |
| 05/06/2026 | `0379c01` | chore: atualiza STATE.md e pnpm-lock.yaml |
| 05/06/2026 | `501b899` | fix(web): sidebar |
| 05/06/2026 | `788a063` | fix(web): AuthArtPanel |
| 05/06/2026 | `37635cd` | feat(web): editar cliente |
| 05/06/2026 | `9f4c4dc` | feat(web): nova OS |
| 05/06/2026 | `17e8673` | feat(web): novo orçamento em 5 etapas |
| 05/06/2026 | `8eb54de` | feat(web): fidelidade de design em todas as telas principais |
| 05/06/2026 | `5713f53` | fix(web): fidelidade visual |
| 04/06/2026 | `9fd610e` | docs(uat): guia de testes manuais da Fase 3 |
| 04/06/2026 | `b4bff38` | fix(tests): mock PlanLimitsService em QuoteService e CustomerService |
| 04/06/2026 | `cf92cc4` | feat(phase-3/wave5): migration, smoke tests billing e runbook; commit alega fase concluída |
| 04/06/2026 | `291e4f7` | feat(phase-3/wave4): site, banners, InviteModule e página `/equipe` |

Último trabalho confirmado: documentação de teste manual em `419d00d`. Último código confirmado: plano/equipe e ajustes de billing em `93f7d04`, depois de Dashboard/Financeiro/Agenda em `1a9f275` e `94ede52`.

## 3. Estado atual do GSD

### Inventário e conclusão real

| Fase | Artefatos | Execução real | Verificação humana | Classificação desta auditoria |
|---|---|---|---|---|
| 00 — Validação e fundação | 5 `PLAN`, 5 `SUMMARY`, `VERIFICATION` | Planos executados | Mercado, HTTPS/API, APK e fluxo público ainda exigem evidência | Executada, não encerrada humanamente |
| 01 — Vertical slice | 7 `PLAN`, 7 `SUMMARY`, `VERIFICATION`, `HUMAN-UAT` | Planos executados | `HUMAN-UAT` declara `approved` no cabeçalho, mas o corpo mantém 8 itens `awaiting` e 0 aprovados | Executada, registro contraditório |
| 02A — MVP funcional | 12 planos P + 3 gap closures G, todos com `SUMMARY`; `VERIFICATION` | `12/12` programático e `gaps_remaining: []` | `02-VERIFICATION.md` permanece `human_needed`; PDF, APK/link público e canvas touch continuam manuais | Última fase programaticamente verificada; não encerrada humanamente |
| 03 — Monetização | 9 `PLAN`; nenhum `SUMMARY`, `VERIFICATION` ou resultado UAT | Commits implementam as waves e trabalho posterior | Roteiro UAT existe, sem resultados | Última fase executada em código; não verificável como concluída |
| 02B — Operações | Nenhuma pasta ou plano GSD | Dashboard, Payment e Appointment foram implementados parcialmente em 07/06 | Sem UAT de fase | Trabalho fora do fluxo GSD |
| 04+ | Nenhum plano executado | Sem evidência | Não aplicável | Não iniciada |

Evidências principais: `.planning/phases/02-mvp-funcional/02-VERIFICATION.md`, `.planning/phases/03-monetizacao/03-P01-PLAN.md` a `03-P09-PLAN.md`, `.planning/phases/03-monetizacao/03-CHECKPOINT.md`, `.planning/ROADMAP.md`, `.planning/STATE.md`, `.planning/PROJECT.md`, `.planning/REQUIREMENTS.md` e `.planning/HANDOFF.json`.

### Fase real atual

- **Última fase realmente concluída:** nenhuma, se “concluída” exigir também os gates humanos registrados.
- **Última fase com verificação programática completa:** Fase 2A.
- **Última fase executada:** Fase 3, seguida por implementação parcial de 2B sem plano GSD.
- **Fronteira ativa real:** estabilização pós-Fase 3, correção de drift de migration/segurança, validação técnica e UAT; não é Fase 4.
- **Planos executados:** Fase 0 `5/5`; Fase 1 `7/7`; Fase 2A `12/12` mais `G01-G03`; Fase 3 possui código correspondente às 9 waves, mas sem summaries auditáveis por plano.
- **Planos pendentes:** não há `PLAN.md` futuro formalmente aberto; faltam transformar a estabilização e a Fase 2B real em planejamento coerente. Isso não autoriza criar ou avançar plano nesta auditoria.
- **Gap closures 2A:** G01 navegação de orçamento, G02 href da sidebar e G03 migrations foram executados. Novos gaps bloqueantes surgiram depois e não estão refletidos no GSD.

### Contradições encontradas

1. `.planning/ROADMAP.md` marca Fases 1, 2A e 3 como concluídas; verificações e UAT não sustentam a afirmação.
2. `.planning/STATE.md` informa MVP, `36/36` e 100%, mas o próprio corpo ainda descreve Fase 3 em andamento e P06–P09 pendentes.
3. `.planning/STATE.md` foi atualizado em 05/06, antes dos commits funcionais de 07/06; não representa o HEAD.
4. `.planning/phases/03-monetizacao/03-CHECKPOINT.md` registra 78%, P04 parcial e P06–P09 pendentes, embora commits posteriores implementem esses lotes; o checkpoint nunca foi reconciliado.
5. A Fase 1 tem `HUMAN-UAT` com frontmatter `approved`, porém todos os 8 testes do corpo continuam pendentes.
6. `.planning/PROJECT.md`, `.planning/REQUIREMENTS.md` e `.planning/HANDOFF.json` permanecem em marcos antigos.
7. A afirmação de “web UI 100% fidelizada” conflita com componentes hardcoded, rotas sem efeito, ausência de responsividade e telas mobile ausentes.

## 4. Linha do tempo recente

| Data | Commit/arquivo | Trabalho comprovado |
|---|---|---|
| 23/05/2026 | `6d0f7ff`; `infra/docker-compose.dev.yml` | MinIO incorporado à infraestrutura local da Fase 2A. |
| 23/05/2026 | `7a42ddb`; `apps/web/app/(auth)/signup/page.tsx` | Signup web em duas etapas. |
| 23/05/2026 | `1cbb819`, `5088d38`; módulo Auth | Forgot/reset password no backend. Interfaces web/mobile não acompanharam. |
| 23–24/05/2026 | `407a66b`; módulo Work Order | OS e fluxo operacional inicial. |
| 23–24/05/2026 | `7943eb3`; `quote-pdf.service.tsx` | PDF com marca d’água do Orcivo Livre. |
| 23–24/05/2026 | `bcf2a3b`, `d35b504`; aprovação pública | Link público, três métodos, assinatura desenhada e configuração de métodos. |
| fim de maio/2026 | `e260182` e waves posteriores | Primeiras rodadas de auditoria/refatoração de fidelidade visual. |
| 27/05/2026 | `0627989`; `prisma/schema.prisma` | Scaffold/schema de monetização e limites de plano. |
| 27/05–04/06/2026 | `b9ff2a3`, `3a585d3`, `92e113c`, `291e4f7`, `cf92cc4` | Billing/webhook, limites, site, banners e convites; commit final alega conclusão da Fase 3 sem artefatos de encerramento. |
| 04/06/2026 | `docs/runbooks/phase-3-uat.md` | Roteiro manual de Fase 3 criado, sem resultado registrado. |
| 05/06/2026 | `5713f53` a `35e0f90` | Grande refatoração visual web e atualização de STATE para 100%; a auditoria atual não confirma 100%. |
| 07/06/2026 | `2ec6694`, `7d294da`, `dfe27a8`, `c610874` | PDF sob demanda, alinhamento visual, fontes embutidas e ajuste de specs. |
| 07/06/2026 | `94ede52` | Backend de Recebimentos, Compromissos e Dashboard: início de fato da Fase 2B, sem planejamento correspondente. |
| 07/06/2026 | `1a9f275`, `a9509a1` | Web de Dashboard, Financeiro, Agenda e Documentos com dados reais. |
| 07/06/2026 | `93f7d04` | Plano/equipe com dados reais e ajustes de billing/membros. |
| 07/06/2026 | `5c97fe0`, `419d00d`; `docs/TESTE-MANUAL-PASSO-A-PASSO.md` | Auditoria documental e checklist consolidado de 54 verificações, todas ainda abertas. |

## 5. Matriz de funcionalidades

### Auth

| Área | Funcionalidade | Estado | Evidência | Próxima ação |
|---|---|---|---|---|
| Auth | Signup web | Implementado mas sem teste humano | `apps/web/app/(auth)/signup/page.tsx`; `apps/backend/src/auth/auth.controller.ts` | Executar UAT-01 a UAT-04 e alinhar senha/confirmação ao contrato vigente. |
| Auth | Signup mobile | Quebrado ou aparentemente inconsistente | `apps/mobile/src/screens/auth/SignupStep1Screen.tsx`; `SignupStep2Screen.tsx`; typecheck mobile falha | Corrigir o gate de tipos antes de UAT em dispositivo. |
| Auth | Login | Implementado mas sem teste humano | `apps/backend/src/auth/auth.controller.ts`; `apps/web/app/(auth)/login/page.tsx`; `apps/mobile/src/screens/auth/LoginScreen.tsx` | Executar UAT-05 e UAT-06 nos dois clientes. |
| Auth | Refresh | Parcial | Backend e middleware web existem; mobile armazena tokens, mas não há renovação automática comprovada | Implementar/testar renovação mobile e expiração concorrente. |
| Auth | Logout | Quebrado ou aparentemente inconsistente | `apps/web/app/api/auth/logout/route.ts` apaga apenas o cookie de acesso; backend e mobile possuem logout | Revogar refresh token e apagar os dois cookies no web. |
| Auth | Forgot-password | Parcial | Endpoint/backend e mail provider existem; `apps/web/app/(auth)/login/page.tsx` mostra texto sem fluxo | Criar interfaces e testar entrega sem registrar token. |
| Auth | Reset-password | Parcial | `apps/backend/src/auth/auth.service.ts`; não há tela web/mobile e sessões existentes não são revogadas | Completar clientes e revogar refresh sessions após reset. |
| Auth | Rotas públicas | Parcial | Decorator público, health/auth/aprovação existem; token público tem fallback indefinido no banco | Definir expiração efetiva e limitar superfícies públicas. |
| Auth | Middleware e guards | Quebrado ou aparentemente inconsistente | `apps/backend/src/app.module.ts`; `tenant.guard.ts`; `subscription-status.guard.ts`; Invite sem `TenantGuard` | Corrigir ordem/escopo e adicionar autorização por papel. |

### Core

| Área | Funcionalidade | Estado | Evidência | Próxima ação |
|---|---|---|---|---|
| Core | Empresas e multi-tenant | Parcial | `prisma/schema.prisma:36`; módulos Company/Tenant; várias relações usam `company_id` | Fechar IDORs e constraints compostas antes de considerar isolamento válido. |
| Core | Clientes | Quebrado ou aparentemente inconsistente | `apps/backend/src/customer/customer.controller.ts`; web envia `PATCH`, mas o controller não expõe update/delete | Alinhar API e UI; executar UAT-07 a UAT-09. |
| Core | Catálogo | Implementado mas sem teste humano | `apps/backend/src/catalog`; telas web/mobile de catálogo | Executar UAT-10 e isolamento entre empresas. |
| Core | Orçamentos | Implementado mas sem teste humano | `apps/backend/src/quote`; `apps/web/app/(app)/orcamentos`; telas mobile | Executar o fluxo UAT-11 a UAT-23 após fechar atomicidade/tenant. |
| Core | Itens de orçamento | Parcial | `prisma/schema.prisma:240`; criação por catálogo/manual e cálculo Decimal | Adicionar isolamento estrutural e validar cálculos/descontos. |
| Core | Estados do orçamento | Parcial | `QuoteStatus` em `prisma/schema.prisma:187`; transições no QuoteService | Formalizar máquina de estados, rejeição e idempotência. |
| Core | PDF | Quebrado ou aparentemente inconsistente | `apps/backend/src/quote/quote-pdf.service.tsx`; teste mocka renderer; percentual é apresentado como moeda em trecho de desconto | Validar PDF real, acentos, marca, assinatura e desconto percentual. |
| Core | Link público | Parcial | rota `apps/web/app/approve/[token]/page.tsx`; lookup no QuoteService | Expirar no banco e proteger contra replay/enumeração. |
| Core | Três métodos de aprovação | Quebrado ou aparentemente inconsistente | `ApprovalMethod` em `prisma/schema.prisma:201`; métodos permitidos são retornados, mas não impostos; assinatura desenhada é opcional no DTO | Validar método e payload no servidor; implementar rejeição real. |
| Core | Criação automática de OS | Quebrado ou aparentemente inconsistente | QuoteService cria OS após a transação de aprovação | Tornar aprovação, registro, assinatura/PDF e OS atomicamente recuperáveis/idempotentes. |
| Core | OS | Implementado mas sem teste humano | `apps/backend/src/work-order`; telas web/mobile | Executar UAT-24 e UAT-26; validar todos os estados e tenant. |
| Core | Fotos BEFORE/DURING/AFTER | Implementado mas sem teste humano | `PhotoStage` e `WorkOrderPhoto` em `prisma/schema.prisma:283,320`; upload no WorkOrder | Executar UAT-25 e retirar acesso público permanente. |
| Core | WhatsApp | Implementado mas sem teste humano | ações web/mobile e link público | Executar UAT-20 em desktop e dispositivo físico. |

### Fase 2B e posteriores

| Área | Funcionalidade | Estado | Evidência | Próxima ação |
|---|---|---|---|---|
| 2B | Agenda | Parcial | `Appointment` em `prisma/schema.prisma:526`; módulo backend e página web Agenda | Versionar migration; completar visões/filtros e UAT-33 a UAT-35. |
| 2B | Financeiro | Parcial | `Payment` em `prisma/schema.prisma:492`; módulo backend e página Financeiro | Versionar migration; validar vínculos de tenant/Decimal e UAT-27 a UAT-32. |
| 2B | Dashboard | Parcial | `apps/backend/src/dashboard`; `apps/web/app/(app)/dashboard` | Remover identidade fake do shell e executar UAT-36 a UAT-40. |
| 2B | Notificações | Não implementado | Não há módulos `Notification`, `DeviceToken` ou `AppointmentReminder` no schema/código | Planejar somente após estabilizar a fase atual. |
| Posterior | Admin master | Somente scaffold | `apps/admin`; scripts placeholder | Manter fora do caminho crítico até requisitos/autorização. |
| Fase 3 | Limites de plano | Parcial | `PlanLimit`, `PlanLimitsService`, guards em customer/quote/OS/invite | Corrigir fail-open, corrida count/create, limites divergentes e gates ausentes. |
| Posterior | Analytics | Não implementado | Nenhuma integração Umami/analytics operacional encontrada | Planejar depois da estabilização. |
| Posterior | Error tracking | Não implementado | Nenhuma integração GlitchTip/error tracking encontrada | Adicionar apenas em ciclo próprio. |
| Fase 3 | Billing | Quebrado ou aparentemente inconsistente | `Subscription`, `SubscriptionPayment`, webhook Asaas, checkout e página Plano | Fechar autenticação/retry/idempotência/preços/roles antes de ativar cobrança. |

### Banco, migrations e ambiente

| Item | Estado e evidência |
|---|---|
| Schema | `prisma/schema.prisma` é sintaticamente válido e contém 22 models e 18 enums. |
| Migrations versionadas | Apenas `20260523000000_phase_2a`, `20260523000001_company_approval_methods` e `20260527000000_phase_3_billing`. |
| Drift bloqueante | `Payment` (`prisma/schema.prisma:492-515`) e `Appointment` (`:526-545`) não aparecem em migration. |
| Multi-tenant estrutural | Models principais possuem `company_id`, porém `QuoteItem` e `QuoteApproval` não; referências entre IDs não usam constraints compostas de tenant. |
| Relações faltantes | Payment para quote/OS e Appointment para OS são apenas IDs sem FK; AuditLog/WorkOrderPhoto/CompanyInvite também têm relações incompletas. |
| Models ausentes previstos | `RequestIdempotency`, `AppointmentReminder`, `Notification`, `DeviceToken` e `FinancialCategory`. |
| Índices/constraints | Faltam, entre outros, índice composto de convite por empresa/status e proteção composta para impedir vínculo cross-tenant. |
| Decimal | Quote e Payment usam Decimal no schema; partes da UI financeira convertem para `Number`, exigindo teste de precisão/formatação. |
| Monorepo | `pnpm-workspace.yaml` inclui `apps/*` e `packages/*`; raiz usa Turbo e exige Node >=20/pnpm >=9. |
| Scripts | `dev:infra`, `dev:backend`, `dev:web`, `dev:mobile`; `db:push:test` contém `--force-reset` e não foi executado. |
| Infra local | `infra/docker-compose.dev.yml`: PostgreSQL 16/5432, Redis 7/6379, MinIO 9000/9001. A configuração foi validada, mas o daemon Docker estava indisponível. |
| Divergência de banco | Compose cria `orcivo_dev`; o exemplo do backend aponta outro nome. O runbook afirma que o exemplo está pronto, portanto o setup não é autoconsistente. |
| Env examples | Backend e mobile possuem `.env.example`; web usa `.env.local.example`. As chaves foram inventariadas sem ler valores de ambientes reais. O exemplo backend não documenta as chaves Asaas usadas pelo código. |
| Portas de apps | Backend 3000, web 3001, site 3002; infraestrutura conforme linha anterior. |
| Dispositivo físico | `docs/runbooks/phase-2a-uat.md:14-27` exige IP LAN; `apps/mobile/app.config.js:27` fixa fallback `localhost`, impedindo que o fallback LAN de `src/config.ts` seja alcançado. `APP_WEB_URL` também precisa do IP LAN para o link público no celular. |
| Setup | O runbook 2A cobre MinIO e dispositivo; documentação local mais antiga ainda descreve apenas PostgreSQL/Redis e está desatualizada. |
| Docker backend | `apps/backend/Dockerfile` não copia schema Prisma nem executa `prisma generate`, e copia apenas `src` de shared-types embora o package runtime aponte para `dist`; build limpo é inconsistente. |

## 6. Validações executadas

`node_modules` já existia. Nenhuma instalação ou atualização de dependência foi feita. Para evitar scripts com correção automática, o lint do backend foi executado diretamente sem `--fix`.

| Comando | Resultado | Observação |
|---|---|---|
| `node --version` | OK: `v24.11.1` | Projeto exige Node >=20; difere do Node 20 indicado no runbook. |
| `pnpm --version` | Não disponível | `pnpm` não está no PATH. |
| `corepack pnpm --version` | Não executável | Falhou com `EPERM` ao acessar cache externo ao workspace; nenhuma instalação foi tentada. |
| `tsc --noEmit -p packages/shared-types/tsconfig.json` | PASS | Tipos compartilhados. |
| `tsc --noEmit -p apps/backend/tsconfig.json` | PASS | Backend. |
| `tsc --noEmit -p apps/web/tsconfig.json` | PASS | Web. |
| `tsc --noEmit -p apps/mobile/tsconfig.json` | FAIL | 4 erros: incompatibilidade de `QuoteDetail` em `AppTabs.tsx`; imports/variável não usados em `SignupStep2Screen.tsx` e `ClienteCreateScreen.tsx`. |
| `tsc --noEmit -p apps/site/tsconfig.json` | PASS | Site institucional. |
| `eslint apps/backend/src apps/backend/test --ext .ts` | FAIL | 19 problemas: 18 erros e 1 warning; specs fora do parser project, `any`, `prefer-const` e `console`. |
| `next lint` em `apps/web` | FAIL | 4 erros `react/no-unescaped-entities` e 2 warnings de `<img>`. |
| `eslint` em `apps/mobile` | FAIL | 28 erros de parsing; configuração ESLint não entende os imports TypeScript. |
| `next lint` em `apps/site` | FAIL | 8 erros de parsing e plugin Next não detectado. |
| `prisma validate` com `DATABASE_URL` dummy no processo | PASS | `prisma/schema.prisma` válido; nenhuma conexão/migration aplicada e nenhum valor real exposto. |
| `jest` em `packages/shared-types` | PASS | 1 suite, 15 testes. |
| `jest --runInBand` em 7 specs unitárias do backend, sem `globalSetup` | PASS | 7 suites, 34 testes: AuthService, JWT/Tenant guards, Company, Customer, Quote PDF e QuoteService. |
| `tsc -p packages/shared-types/tsconfig.json` | PASS | Build de shared-types. |
| `nest build` em `apps/backend` | PASS | Compilação Nest concluída. |
| `next build` em `apps/web` | FAIL | Compilação concluiu; build parou nos mesmos erros de lint. |
| `next build` em `apps/site` | FAIL | Primeira tentativa não acessou fonte Inter; repetição com rede compilou, mas falhou na configuração ESLint. |
| `docker compose -f infra/docker-compose.dev.yml config --quiet` | PASS | Compose válido; apenas warnings de acesso à configuração local do Docker. |
| `docker compose -f infra/docker-compose.dev.yml ps --all` | FAIL | Docker Engine não estava rodando; serviços não foram iniciados. |
| Scan estático de nomes/padrões de segredo, excluindo `.env` reais e gerados | PASS | 0 credenciais/API keys hardcoded confirmadas no código rastreado. |

Não executados:

- `pnpm lint`, porque o script backend contém `eslint --fix` e a auditoria proíbe alterações.
- `pnpm test`/integração/E2E, porque `apps/backend/test/setup.ts` carrega `.env.test` e `cleanupDatabase()` executa `deleteMany`; o isolamento da base não pôde ser provado sem ler configuração real.
- `db:push`, `db:push:test`, migrations e seed; `db:push:test` é explicitamente destrutivo (`--force-reset`).
- Build mobile real: o script apenas orienta usar EAS Build, que exige serviço/conta externa e validação em dispositivo.
- UAT, pois Docker Engine/backend/web/mobile não estavam disponíveis como ambiente integrado e não há base isolada preparada.
- Build da imagem Docker backend, pois o daemon estava indisponível; a inconsistência do Dockerfile foi confirmada estaticamente.

## 7. UAT humano pendente

Fonte de contagem: `docs/TESTE-MANUAL-PASSO-A-PASSO.md`. Há **54 verificações marcadas `[ ]`**, sem qualquer resultado preenchido. A ordem abaixo preserva a dependência do roteiro: conta nova, dados-base, orçamento, OS e módulos derivados.

| ID | Como testar | Resultado esperado |
|---|---|---|
| UAT-01 | Abrir `/signup` em desktop largo. | Painel esquerdo roxo/preto ocupa proporção adequada e mostra depoimento. |
| UAT-02 | Tentar avançar no signup sem aceitar Termos. | Ação é bloqueada com mensagem de aceite. |
| UAT-03 | Abrir Termos e Privacidade a partir do signup. | Ambos levam a páginas reais. |
| UAT-04 | Concluir as duas etapas com conta nova. | Sessão é criada e Clientes abre vazia. |
| UAT-05 | Fazer logout e login novamente com a conta criada. | Login volta a funcionar com os mesmos dados. |
| UAT-06 | Tentar login com senha incorreta. | Mensagem “Credenciais inválidas”, sem vazar detalhes. |
| UAT-07 | Criar um cliente em Clientes. | Cliente aparece na lista imediatamente. |
| UAT-08 | Abrir o cliente criado. | Detalhe mostra os dados persistidos. |
| UAT-09 | Editar o cliente, salvar e recarregar. | Alteração persiste; hoje há alta probabilidade de falha por ausência de `PATCH` backend. |
| UAT-10 | Criar item de catálogo por R$ 320,00. | Item aparece e o preço usa formato brasileiro. |
| UAT-11 | Abrir Novo orçamento sem cliente. | Salvar/PDF/WhatsApp permanecem desabilitados. |
| UAT-12 | Ainda sem cliente/item, observar a tela. | Aviso orienta selecionar cliente e adicionar item. |
| UAT-13 | Adicionar 4×320 + 1×180 e desconto de 10%. | Total recalculado para R$ 1.314,00. |
| UAT-14 | Após preencher cliente e itens, observar ações. | Ações antes bloqueadas ficam habilitadas. |
| UAT-15 | Gerar o PDF. | PDF contém identidade da empresa, número, itens, total, assinaturas e rodapé. |
| UAT-16 | Conferir textos acentuados no PDF. | “Instalação”, “câmera” e “técnica” não ficam corrompidos. |
| UAT-17 | Conferir total e alinhamento monetário no PDF. | Exibe R$ 1.314,00 em formato brasileiro. |
| UAT-18 | Observar a navegação após gerar PDF. | Orçamento é salvo e o detalhe abre. |
| UAT-19 | Enviar o orçamento no detalhe. | Status vira Enviado e link público é gerado. |
| UAT-20 | Usar Compartilhar no WhatsApp. | `wa.me` abre com mensagem contendo o link correto. |
| UAT-21 | Abrir o link em aba anônima e aprovar. | Página abre sem login e o método escolhido conclui. |
| UAT-22 | Recarregar o app após aprovação. | Orçamento fica Aprovado e uma única OS é criada. |
| UAT-23 | Baixar o PDF após aprovação. | Assinatura/aprovação aparece no documento. |
| UAT-24 | Abrir a OS criada automaticamente. | Número e cliente correspondem ao orçamento. |
| UAT-25 | Enviar fotos Antes/Durante/Depois. | Cada foto aparece no estágio correto. |
| UAT-26 | Alterar status da OS e recarregar. | Novo status persiste. |
| UAT-27 | Registrar recebimentos recebido e pendente. | Tabela mostra cliente, método, status e valores corretos. |
| UAT-28 | Conferir KPIs após os lançamentos. | Recebido e Pendente somam os valores reais. |
| UAT-29 | Conferir gráfico após lançar recebido. | Barra(s) aparecem no dia correto. |
| UAT-30 | Clicar Receber no lançamento pendente. | Status e KPIs atualizam. |
| UAT-31 | Alternar filtro de status. | A tabela exibe somente o conjunto escolhido. |
| UAT-32 | Inspecionar todos os registros financeiros. | Nenhum nome, OS ou valor fake aparece. |
| UAT-33 | Criar compromisso hoje, 09:00–10:00. | Bloco aparece no dia e linha corretos. |
| UAT-34 | Conferir conteúdo do bloco. | Título e cliente/tipo aparecem com barra lateral. |
| UAT-35 | Navegar semanas e voltar. | Compromisso reaparece após recarregar a semana. |
| UAT-36 | Abrir Dashboard com dados criados. | Saudação, empresa e plano são reais; nenhum “João/Ribeiro Elétrica”. |
| UAT-37 | Conferir KPIs do Dashboard. | Agenda, recebimentos e orçamentos refletem os dados criados. |
| UAT-38 | Conferir Agenda de hoje no Dashboard. | Compromisso criado aparece com hora e título. |
| UAT-39 | Testar conta/dia sem compromisso. | Estado vazio é honesto. |
| UAT-40 | Acionar cada ação rápida. | Cada ação leva à tela/formulário correto. |
| UAT-41 | Abrir Documentos > Orçamentos. | Lista somente orçamentos reais. |
| UAT-42 | Usar Baixar PDF e Abrir. | PDF abre e detalhe correto é exibido. |
| UAT-43 | Abrir aba Ordens de Serviço. | Lista as OS reais. |
| UAT-44 | Abrir Recibos e Contratos. | Estado vazio informa claramente que ainda não há recurso. |
| UAT-45 | Abrir Plano com conta Livre. | Plano/status/quantidade de usuários são reais. |
| UAT-46 | Conferir Pagamentos recentes. | Livre informa que não gera cobrança, sem pagamentos fake. |
| UAT-47 | Conferir comparativo mensal. | Livre R$0, Solo R$9,90, Mais R$19,90, Equipe R$39,90. |
| UAT-48 | Buscar texto proibido na página Plano. | “ilimitado” não aparece. |
| UAT-49 | Conferir card do plano atual. | Está destacado e botão Plano atual está desabilitado. |
| UAT-50 | Abrir Equipe. | Usuário atual aparece em Membros ativos. |
| UAT-51 | Convidar e depois revogar membro. | Convite aparece em pendentes e é removido/revogado. |
| UAT-52 | Conferir matriz de permissões. | É somente leitura, com ícones e aviso honesto. |
| UAT-53 | Alterar Empresa, Pix e Aprovação; salvar/recarregar. | Dados persistem; hoje Empresa/Pix parecem stubs e podem falhar. |
| UAT-54 | Percorrer Visual/Notificações e demais abas. | Cada stub é identificado como indisponível, sem fingir persistência. |

Gates humanos antigos ainda não reconciliados, mantidos fora da contagem de 54 para não duplicar fluxos: entrevistas/validação de mercado da Fase 0; API HTTPS externa; APK Android e teste físico; CI; execução específica do fluxo mobile 2A, marca d’água e canvas touch; e os casos de limites, checkout, banners e convites de `docs/runbooks/phase-3-uat.md`. Antes de encerrar uma fase, esses gates devem ser deduplicados contra a tabela e receber resultado explícito.

## 8. Auditoria visual

A comparação foi estática entre implementação e `docs/design-handoff/orcivo-design-system/`, `docs/FRONTEND_DESIGN_MASTER.md`, `docs/OPERATIONS_UI_MISSING_SPECS.md`, previews HTML/JSX e referências PDF. Não houve inspeção visual live porque a stack integrada não subiu. Não foram encontradas media queries sistemáticas no web, nem `loading.tsx`, `error.tsx` ou `not-found.tsx` para as rotas principais.

Há uma contradição de referência: `FRONTEND_DESIGN_MASTER.md:57-58` ainda descreve azul legado, enquanto o handoff atual (`docs/design-handoff/orcivo-design-system/README.md:40-42`) e Operations fixam branco/preto/roxo `#6D28D9`. Para esta auditoria, o handoff Operations/README e os nomes atuais Orcivo Livre/Solo/Mais/Equipe prevalecem.

| Tela | Estado visual | Referência | Gap | Prioridade |
|---|---|---|---|---|
| Web login | Parcialmente fiel | `screens/AuthWeb.jsx`, `auth.css` | Composição próxima, mas forgot-password é inerte, responsividade e estados não estão fechados. | Alta |
| Web signup | Parcialmente fiel | Auth + Forms web | Duas etapas existem; contrato de senha/confirmação e responsividade divergem. | Alta |
| Shell/sidebar/topbar | Parcialmente fiel | `ui_kits/web/Sidebar.jsx`, `TopBar.jsx` | Sidebar mantém usuário/empresa/plano fake; TopBar recebe dados incompletos; layout é rígido. | Bloqueante para UAT visual |
| Dashboard web | Parcialmente fiel | `ui_kits/web/Dashboard.jsx` | Dados reais existem, mas densidade, estados, shell e responsividade não reproduzem integralmente a referência. | Alta |
| Clientes web | Parcialmente fiel | `CustomersAndQuotes.jsx` | Lista/detalhe existem; edição quebra no contrato API, histórico e estados são genéricos. | Alta |
| Catálogo web | Parcialmente fiel | `OtherPages.jsx`, Operations | Estrutura funcional, mas filtros, ações, estados e adaptação a telas pequenas estão incompletos. | Média |
| Orçamentos web | Parcialmente fiel | `QuoteEditor.jsx`, Operations | Editor de 5 passos é a área mais próxima; listagem/filtros/estados/responsividade ainda divergem. | Alta |
| Aprovação pública | Parcialmente fiel | `screens/Public.jsx`, `public.css` | Três métodos visíveis; Rejeitar não executa ação e não há breakpoint confiável. | Bloqueante funcional |
| PDF | Parcialmente fiel | PDFs/previews e handoff tipográfico | Fontes e identidade melhoraram; composição completa, desconto percentual e documento real ainda não foram visualmente testados. | Alta |
| OS web | Parcialmente fiel | `ui_kits/web/Operations.jsx` | Lista/detalhe/fotos existem; estados, filtros, ações sem handler e layout responsivo estão incompletos. | Alta |
| Agenda web | MVP genérico | Operations missing specs | Apenas semana; um evento por slot; faltam mês/dia/lista, filtros e estados. | Alta |
| Financeiro web | MVP genérico | Operations missing specs | KPIs/tabela/modal existem; filtros, precisão, estados e composição completa faltam. | Alta |
| Documentos web | Parcialmente fiel | `OtherPages.jsx` | Orçamentos/OS reais; recibos/contratos são placeholders. | Média |
| Equipe web | Parcialmente fiel | Operations | Dados/convites existem, mas segurança/roles e estados não sustentam a aparência de recurso concluído. | Alta |
| Plano web | Somente scaffold visual | Operations/planos atuais | Preços/limites têm divergências; ações de mudança não funcionam. | Alta |
| Configurações web | Somente scaffold visual | `OtherPages.jsx`, Operations | Apenas Aprovação tem persistência clara; Empresa/Pix e outras abas exibem controles sem efeito/“Em breve”. | Alta |
| Formulários web | Parcialmente fiel | `screens/FormsWeb.jsx`, `forms.css` | Componentes básicos aproximados; validação, erro, loading e responsividade são inconsistentes. | Alta |
| Empty states web | Parcialmente fiel | `screens/States.jsx`, previews empty | Alguns estados honestos; vários erros de API são convertidos em listas/zeros vazios. | Alta |
| Skeletons web | Ausente | `screens/States.jsx` | Não há estratégia de loading por rota. | Média |
| Erros web | Ausente/MVP genérico | `screens/States.jsx` | Sem error boundary/página 404 e com falhas silenciosas. | Alta |
| Mobile auth | MVP genérico | `screens/AuthMobile.jsx`; UI kit mobile | Fluxo existe, mas fidelidade, validação e typecheck não estão fechados. | Alta |
| Mobile home/clientes | MVP genérico | `ui_kits/mobile/Mobile.jsx` | Estrutura básica, pouca hierarquia/estado e sem auditoria em dispositivo. | Alta |
| Mobile catálogo/orçamentos | MVP genérico | UI kit/Operations mobile | Funcional, porém formulário longo no lugar do wizard e conversões numéricas frágeis. | Alta |
| Mobile OS/fotos | MVP genérico | `ui_kits/mobile/Operations.jsx` | Fluxo parcial; telas ainda usam azul legado `#2563EB` em arquivos de OS. | Alta |
| Mobile Agenda/Financeiro/Docs | Ausente | Operations mobile | Navegação direciona para “Em breve”. | Alta |
| Mobile Conta/Config/Equipe/Plano | Ausente | UI kit/Operations mobile | Rotas de Mais são placeholders. | Média |
| Responsividade web/mobile | Ausente/incompleta | Todos os lotes e specs | Layout web sem breakpoints sistemáticos; nenhuma verificação em viewport/dispositivo real. | Bloqueante para aprovação visual |

## 9. Problemas encontrados

### Bloqueantes — 9 grupos

1. **[B1] Drift de migration:** `Payment` e `Appointment` existem no schema/código, mas não em migration; instalações limpas quebram Financeiro e Agenda.
2. **[B2] Isolamento/autorização de tenant:** Invite não usa `TenantGuard`; IDs de customer/catalog/quote/OS/user são aceitos sem validar a empresa; não há guard de papéis. Há risco de leitura/alteração cross-tenant.
3. **[B3] Arquivos privados públicos:** `apps/backend/src/storage/storage.service.ts` aplica policy pública `s3:GetObject` e retorna URLs permanentes para PDFs, fotos e assinaturas, contra o contrato de buckets privados/URL assinada.
4. **[B4] Aprovação não atômica:** status/audit são persistidos antes de assinatura, aprovação, PDF e OS. Falha posterior deixa orçamento aprovado sem artefatos/OS e o retry entra em conflito; método permitido e assinatura desenhada também não são validados corretamente.
5. **[B5] Webhook Asaas fail-open e retry quebrado:** token vazio aceita chamadas; job não configura attempts/backoff; evento `FAILED` é ignorado em retry. Não é seguro ativar billing.
6. **[B6] Guard/checkout/limites de assinatura inconsistentes:** guard global roda antes do tenant e libera quando `companyId` falta; checkout não tem role/idempotência; preços/limites divergem; criação count-then-create tem corrida e fail-open.
7. **[B7] Imagem Docker backend não reproduzível:** Dockerfile não inclui schema/generate Prisma e entrega shared-types sem o `dist` esperado em runtime.
8. **[B8] Gates de qualidade vermelhos:** mobile não passa typecheck; lint falha em backend/web/mobile/site; builds web/site falham. Não há baseline verde para UAT.
9. **[B9] Integração/E2E sem isolamento demonstrado:** setup apaga dados com `deleteMany`, depende de `.env.test` não auditável e não pôde ser executado com segurança; isolamento multi-tenant crítico permanece sem prova automatizada atual.

### Importantes

- Web de edição de cliente chama `PATCH` inexistente no controller backend.
- Logout web não revoga refresh; reset de senha não invalida sessões anteriores; mobile não renova token automaticamente.
- Forgot/reset password não possuem telas web/mobile completas.
- Página pública exibe Rejeitar sem implementação; token cai para lookup no banco sem expiração efetiva.
- PDF imprime desconto percentual como valor monetário em um trecho e os testes mockam o renderer real.
- Shell mantém identidade fake em `apps/web/components/AppSidebar.tsx`; contradiz UAT e fidelidade.
- Configuração mobile favorece `localhost` e pode impedir acesso por dispositivo físico.
- Nome do banco no Compose e no env example diverge; documentação afirma incorretamente que não é necessário editar.
- Documentos de planejamento/handoff essenciais estão não rastreados; o estado não é reprodutível.
- Ausência sistemática de loading, error boundary, 404 e breakpoints; falhas de API são frequentemente mascaradas como vazio/zero.
- `apps/backend/src/mail/console-mail.service.ts` registra corpo de e-mail em console; em reset local isso pode incluir token sensível.
- Rate limiting está concentrado em login; signup, forgot/reset, aprovação pública e webhook não têm proteção equivalente.

### Dívida técnica

- TODO explícito em `apps/web/app/(app)/clientes/[id]/page.tsx` para filtrar orçamentos do cliente.
- Uso de `any` em controllers/payloads e navegação mobile; lint não possui configuração consistente entre workspaces.
- URLs localhost espalhadas em fallbacks e docs; falta uma fonte única de URLs por ambiente.
- Ausência de `RequestIdempotency`, embora o mobile envie `X-Client-Request-Id`.
- Duplicação e divergência entre documentos mestres, uploads do handoff, ROADMAP, STATE, checkpoints e auditorias antigas.
- Conversões `Decimal -> Number` no financeiro precisam de política comum de serialização/formatação.
- Testes de PDF validam mocks, não bytes/layout/fontes/marca d’água reais.
- Admin, configurações, plano e documentos possuem controles/placeholders com aparência mais completa do que a capacidade real.

### Melhorias futuras

- Notificações, lembretes, device tokens e categorias financeiras.
- Analytics/Umami e error tracking/GlitchTip.
- Admin master funcional com autorização explícita.
- Agenda/Financeiro/Documentos no mobile.
- Contratos, recibos e demais módulos posteriores, somente depois da estabilização.

### Segurança: resultado resumido

Não foram encontradas credenciais/API keys hardcoded confirmadas no código rastreado e nenhum `.env` real foi lido. Isso não compensa os riscos de tenant isolation, autorização, storage público, webhook, sessões e logs descritos acima; esses riscos são de desenho/implementação e bloqueiam ativação real.

## 10. Próximo passo recomendado

**Criar e executar, em um ciclo posterior a esta auditoria, um único plano GSD de estabilização pós-Fase 3 para fechar os 9 grupos bloqueantes, começando pela migration versionada de `Payment`/`Appointment` e pelos invariantes de tenant/autorização; não iniciar Fase 4 nem declarar Fase 3 concluída antes de recuperar todos os gates verdes.**

## 11. Plano de retomada

1. **Correções bloqueantes:** migration, tenant/roles, storage privado, aprovação idempotente, webhook/billing, Docker e baseline de lint/typecheck/build/test isolado.
2. **UAT:** preparar base descartável e ambiente completo; executar as 54 verificações, os gates mobile/HTTPS e o roteiro de monetização, registrando evidência e falhas.
3. **Fidelidade visual:** corrigir primeiro shell/identidade, responsividade, estados e fluxos quebrados; depois comparar web/mobile/PDF em viewports e dispositivo reais com os HTML/JSX/PDF de referência.
4. **Encerramento da fase atual:** reconciliar ROADMAP/STATE/checkpoints/summaries/verifications somente após código, migrations, CI e UAT concordarem; a fase atual não está aprovada nesta auditoria.
5. **Próxima fase:** planejar formalmente a Fase 2B restante e só então escolher a próxima execução, sem misturar billing, operações e módulos futuros.
