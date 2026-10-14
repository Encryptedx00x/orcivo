# B4-30 — Matriz de multiempresa e isolamento

**Data:** 2026-10-14  
**Escopo inspecionado:** Prisma; auth, invite e company no backend; AuthProvider web; AuthContext app; shared-types.

## Estado atual

| Capacidade                 | Estado confirmado                                                          | Consequência                                                         |
| -------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| usuário em várias empresas | schema já permite por `CompanyMember` e chave única empresa+usuário        | base relacional é compatível                                         |
| papel por empresa          | `role` pertence a `CompanyMember`                                          | Leo pode ser ADMIN na Gastrobodes e OWNER na empresa privada         |
| isolamento dos dados       | entidades operacionais usam `company_id`; serviços recebem tenant do guard | base existente deve ser preservada em todo endpoint                  |
| login                      | escolhe `companyMember.findFirst`                                          | com dois vínculos, empresa ativa é implícita e não determinística    |
| tenant guard               | escolhe outro `findFirst` e cacheia `tenant:{user}`                        | pode divergir da empresa devolvida no login                          |
| JWT                        | contém apenas usuário/e-mail                                               | token não declara a empresa ativa                                    |
| refresh token              | agrupa `session_id`, mas não guarda empresa                                | refresh não consegue preservar escolha por dispositivo/sessão        |
| web                        | contexto expõe uma empresa e nem sempre seu ID                             | não há lista/troca explícita                                         |
| app                        | SecureStore persiste uma empresa                                           | não há lista/troca; caches locais precisam ser separados/limpos      |
| criar empresa adicional    | signup de empresa devolve o primeiro vínculo existente                     | usuário não consegue criar sua empresa privada adicional             |
| convite                    | vínculo é tenant-scoped e aceita papel                                     | aceite público não autentica de forma confiável usuário já existente |
| auditoria                  | linha inclui `company_id` e ator                                           | adequada se o tenant ativo vier da sessão validada                   |
| plano/billing              | assinatura é única por empresa                                             | troca de empresa também troca plano, limites e estado de cobrança    |

## Matriz de isolamento obrigatória

| Cenário                                 | Prova esperada                                                         | Teste faltante/prioridade |
| --------------------------------------- | ---------------------------------------------------------------------- | ------------------------- |
| mesma pessoa em A e B, token ativo em A | lista/detalhe/escrita de B retornam 404/403; nunca dados               | integração crítica        |
| troca A → B                             | novo contexto mostra somente B; plano, papel e empresa mudam juntos    | integração crítica        |
| duas sessões, A e B                     | cada dispositivo permanece em sua empresa escolhida                    | integração crítica        |
| papel OWNER em A e MEMBER em B          | autorização usa o papel do vínculo da empresa ativa                    | integração crítica        |
| empresa fora dos vínculos               | seleção falha sem revelar nome/dados                                   | unit + integração         |
| vínculo inativado                       | acesso/refresh falham mesmo com JWT não expirado                       | integração crítica        |
| refresh após troca                      | preserva B; nunca volta ao primeiro `findFirst`                        | unit + integração         |
| caches Redis                            | chaves incluem usuário+empresa/sessão; invalidar papel/vínculo correto | unit                      |
| convite para e-mail já cadastrado       | adiciona vínculo ao mesmo usuário, sem recadastro/duplicação           | integração                |
| convite já aceito/revogado/expirado     | não cria segundo vínculo nem troca empresa silenciosamente             | integração                |
| criar segunda empresa própria           | cria Company + OWNER em transação sem mexer na primeira                | integração                |
| auditoria                               | evento fica na empresa onde ocorreu e registra ator                    | integração                |
| idempotência/numeração                  | chaves e números continuam isolados por `company_id`                   | integração                |
| logo/fotos/assinaturas                  | storage key e URL assinada pertencem à empresa ativa                   | integração de storage     |
| back/forward após troca                 | UI não reapresenta cache ou draft da empresa anterior                  | web/app contrato + visual |
| requisições concorrentes durante troca  | cada request usa o tenant do token que a iniciou                       | integração                |

Os testes P02 atuais provam isolamento entre usuários/tenants distintos, IDs relacionados, convites e RBAC. Eles não
provam o caso mais importante desta ADR: **o mesmo `user_id` com dois vínculos ativos e tokens ligados a empresas
diferentes**.

## Ameaças e controles

| Ameaça                         | Vetor                                            | Controle obrigatório                                                         |
| ------------------------------ | ------------------------------------------------ | ---------------------------------------------------------------------------- |
| tenant aleatório               | `findFirst` sem seleção                          | remover fallback quando houver mais de um vínculo                            |
| spoof de empresa               | header/body com `company_id` arbitrário          | empresa vem de token/sessão emitidos após validar membership                 |
| cache cruzado                  | `tenant:{user}`                                  | chave por usuário+empresa/sessão e invalidação direcionada                   |
| papel errado                   | cache/papel do primeiro vínculo                  | resolver role do par usuário+empresa em toda sessão                          |
| refresh volta à empresa errada | refresh sem empresa                              | persistir empresa no refresh da sessão e assinar `cid` no access token       |
| dado antigo na tela            | query/draft/cache não namespaced                 | cancelar requests e limpar/particionar estado ao trocar                      |
| aceite duplica usuário         | convite público cria conta para e-mail existente | autenticar o usuário existente antes de criar membership                     |
| enumeração                     | selecionar UUID alheio                           | resposta neutra 404/403 e nenhum detalhe da empresa                          |
| acesso após remoção            | JWT ainda válido                                 | validar membership ativo para `sub+cid`, com cache curto/invalidação         |
| arquivo de outro tenant        | key/URL sem tenant                               | prefixo `company_id`, autorização antes de assinar URL                       |
| job/webhook sem tenant         | processamento assíncrono infere empresa          | payload persistido inclui `company_id` verificado                            |
| auditoria ambígua              | troca não registrada                             | auditar seleção/troca e ações no tenant efetivo, sem copiar dados entre logs |

## Cobertura automática atual a preservar

- `p02-tenant-rbac.isolation.spec.ts`: leitura/escrita cross-tenant, related IDs, convites, RBAC e fail-closed.
- `tenant.guard.spec.ts`: cache, membership ativa, contexto ausente e falha fechada.
- `auth.service.spec.ts`/`auth.e2e.spec.ts`: login, refresh, rotação/revogação e atualização de conta.
- `invite.service.spec.ts`: estados do convite, criação do vínculo e invalidação dos caches atuais.

Esses testes devem ser estendidos, não substituídos, pela matriz acima.
