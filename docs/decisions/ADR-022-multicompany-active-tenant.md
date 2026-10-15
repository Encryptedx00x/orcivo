# ADR-022 — Multiempresa, empresa ativa e isolamento por sessão

**Status:** Aprovado pelo dono em 2026-10-15 — gate B4-33 formalizado após a conclusão da B4-44
**Data:** 2026-10-14
**Relacionado:** B4-30 (levantamento), B4-38/B4-39 (implementação condicionada), ADR-011/013/014

## Decisão do dono — 2026-10-15

- empresa ativa é definida por sessão/dispositivo;
- login com vários vínculos exige seleção explícita;
- implementar `AuthSession` como fonte da empresa ativa;
- não criar bloqueio comercial artificial para empresas privadas adicionais nesta onda;
- Gastrobodes usa Arlindo `OWNER`, Leo `ADMIN` e Marcus no papel operacional interno `TECNICO`, exibido como “Membro”;
- sessões legadas multiempresa exigem nova seleção/login, sem `findFirst` silencioso;
- saída, transferência do último OWNER e exclusão permanecem adiadas para requisito destrutivo próprio.

## Contexto

O cenário desejado é:

- Arlindo cria a empresa compartilhada Gastrobodes e mantém uma empresa individual privada;
- Leo e Marcus entram na Gastrobodes sem recadastrar identidade e também mantêm empresas individuais privadas;
- cada pessoa tem papel próprio em cada empresa;
- cliente, orçamento, OS, recebimento, documento, histórico, arquivo, plano e auditoria nunca vazam entre empresas;
- a empresa ativa é visível e pode ser trocada conscientemente.

O schema já representa usuário ↔ empresa como muitos-para-muitos por `CompanyMember`, com papel e estado ativo por
vínculo. O problema está na sessão: login, JWT e TenantGuard usam `findFirst`, o access token não leva empresa e os
caches usam somente `userId`. Com dois vínculos, a empresa devolvida no login e a usada pelo guard podem ser
diferentes. Portanto, habilitar apenas um seletor na UI seria inseguro.

O inventário e a matriz completa estão em `docs/qa/B4-30-MULTICOMPANY-ISOLATION-MATRIX.md`.

## Decisão proposta

### 1. Empresa ativa pertence à sessão, não ao usuário

Cada sessão/dispositivo mantém sua própria empresa ativa. Leo pode usar Gastrobodes no celular e sua empresa privada
no desktop sem uma troca global entre dispositivos. Não adicionar `active_company_id` a `User`.

O access token deve conter `sub`, `sid` e `cid` (usuário, sessão e empresa ativa). O refresh token da sessão deve ser
ligado à mesma empresa para que a rotação preserve a escolha. O backend nunca aceita `company_id` do corpo/header como
autoridade de tenant.

O JWT não substitui a validação: `JwtStrategy`/`TenantGuard` verificam vínculo ativo para o par `sub+cid` e resolvem o
papel desse vínculo. O contexto do request continua sendo `companyId` e `role`, mas não pode mais vir de `findFirst`.

### 2. Contratos de autenticação e empresa

Proposta de endpoints/contratos shared-types:

- `POST /auth/login`: com um vínculo, mantém resposta direta; com vários, retorna `requires_company_selection`, lista
  mínima (`company_id`, nome, papel) e token curto de seleção que não acessa rotas tenant;
- `POST /auth/select-company`: valida token de seleção + vínculo e emite o primeiro par access/refresh ligado à
  empresa;
- `GET /companies`: lista somente vínculos ativos do usuário autenticado, com empresa ativa e papel;
- `POST /auth/switch-company`: recebe o alvo e o refresh atual, valida o vínculo, rotaciona/revoga a sessão anterior e
  devolve novo par + empresa/papel;
- `POST /companies`: cria uma nova Company e membership OWNER em transação, sem alterar ou copiar dados das empresas
  existentes;
- aceite de convite para usuário existente exige autenticação e adiciona somente o novo membership.

O contrato de login pode evoluir como união discriminada para preservar clientes atuais. Nenhuma rota tenant aceita o
token curto de seleção.

### 3. Persistência e migração

A relação CompanyMember e os `company_id` operacionais são preservados. A implementação deve acrescentar, de forma
idempotente, a empresa da sessão ao mecanismo de refresh. Duas opções técnicas são válidas:

1. adicionar `company_id` ao `RefreshToken` e manter o `session_id` atual; ou
2. materializar `AuthSession` com empresa ativa e relacionar os refresh tokens rotacionados.

Recomendação: **opção 2**, porque torna troca, revogação, versão da sessão e auditoria explícitas sem duplicar estado em
cada token rotacionado. `AuthSession` contém `id`, `user_id`, `active_company_id`, `version`, datas e revogação; é dado
de sessão, não dado operacional compartilhável.

Migração em fases:

1. criar tabela/índices/FKs sem remover `RefreshToken.session_id`;
2. novas sessões já nascem ligadas a empresa; sessão antiga com exatamente um vínculo pode ser convertida ao
   autenticar/refresh;
3. usuário com vários vínculos e sessão legada é levado à seleção, nunca a um `findFirst`;
4. depois da janela de compatibilidade, tornar a relação obrigatória e remover o fallback legado em migration própria.

Forçar novo login para sessões legadas multiempresa é aceitável e mais seguro que escolher uma empresa
silenciosamente; a decisão operacional final fica no gate.

### 4. Cache, autorização e auditoria

- Cache de membership usa no mínimo `membership:{user}:{company}`; contexto de sessão usa `session:{sid}`.
- Alterar/desativar vínculo invalida somente caches daquele usuário+empresa e sessões que apontam para ela.
- Papel é sempre o do vínculo ativo; OWNER em uma empresa não dá privilégio em outra.
- Troca registra evento de segurança com ator, empresa anterior/nova e sessão, sem copiar detalhes operacionais.
- A auditoria de negócio continua gravada na empresa onde a ação ocorreu.
- Plano, assinatura e limites vêm da empresa ativa, nunca do usuário.

### 5. Convite e onboarding

Aceitar convite não exige recadastrar dados:

- e-mail sem conta: fluxo atual cria identidade, aceita documentos legais e cria membership;
- e-mail com conta: autentica a identidade existente, confirma que o e-mail corresponde ao convite e cria apenas o
  membership;
- usuário já membro recebe resposta idempotente, sem vínculo duplicado;
- convite não troca empresa ativa silenciosamente; ao concluir, oferece “Ir para Gastrobodes” ou “Continuar em
  [empresa atual]”.

Criar empresa privada adicional é ação autenticada separada do signup inicial. Ela cria Company + OWNER em transação e
depois oferece a troca; não clona clientes, configurações, plano ou documentos.

### 6. Wireflow Arlindo, Leo e Marcus

```text
Arlindo
  cria Gastrobodes -> OWNER -> sessão ativa Gastrobodes
  cria Arlindo Serviços -> OWNER -> escolhe se quer trocar
  convida Leo (ADMIN) e Marcus (MEMBER) para Gastrobodes

Leo / Marcus
  abrem convite -> entram na conta existente -> aceitam sem recadastro
  veem [empresa privada] + [Gastrobodes] no seletor
  escolhem Gastrobodes -> novo token/sessão tenant-scoped

Troca de empresa
  confirmar alvo -> cancelar requests -> rotacionar sessão -> limpar/particionar caches e drafts
  recarregar home, papel, plano e atalhos da empresa escolhida
  cabeçalho/menu mantém o nome da empresa ativa sempre visível
```

No web desktop, o seletor pode ficar no menu da conta/sidebar existente. Em web mobile e app, usa sheet/lista de tela
inteira com alvos confortáveis; modos fácil/completo compartilham o mesmo componente e contexto. A troca não pode ficar
apenas em Configurações, porque o usuário precisa confirmar o tenant antes de agir.

Se houver formulário/draft não salvo, a troca pede confirmação para descartar ou permanece na empresa atual. Não é
permitido transportar draft, busca, upload pendente ou resposta cacheada entre empresas.

### 7. Isolamento e resposta visual

Após a troca, toda superfície deve:

- mostrar imediatamente nome e papel da empresa ativa;
- limpar dados da empresa anterior antes de renderizar a nova;
- usar skeleton/loading em vez de misturar conteúdo antigo e novo;
- impedir voltar pelo histórico para dados em cache sem revalidação;
- mostrar erro neutro se o vínculo foi removido e retornar ao seletor/login;
- manter cada sessão independente em dispositivos diferentes.

## Decisões reservadas ao dono (B4-33)

1. Aprovar empresa ativa por sessão/dispositivo, em vez de preferência global do usuário.
2. Aprovar seleção obrigatória no login quando houver vários vínculos.
3. Aprovar `AuthSession` como modelo recomendado ou preferir extensão de `RefreshToken`.
4. Definir se uma pessoa de qualquer plano pode criar múltiplas empresas privadas ou se isso depende de plano
   comercial; não criar bloqueio artificial antes da decisão.
5. Aprovar papéis iniciais na Gastrobodes (exemplo recomendado: Arlindo OWNER, Leo ADMIN, Marcus MEMBER/TECNICO
   interno).
6. Aprovar o comportamento de sessão legada multiempresa: recomendação é forçar seleção/novo login.
7. Definir regras de sair da empresa, transferência do último OWNER e exclusão; não implementar remoção destrutiva
   nesta onda sem requisito próprio.

## Alternativas descartadas

- **`active_company_id` no User:** uma aba/dispositivo troca o contexto de todos os outros e cria corridas.
- **Header `X-Company-Id` sem token ligado:** permite spoof e exige lembrar validação em toda rota.
- **Continuar com `findFirst`:** resultado implícito/não determinístico e risco de divergência login/guard.
- **Um usuário por empresa:** duplica identidade, senha, preferências e impede o cenário solicitado.
- **Copiar dados ao ingressar:** viola isolamento e cria conflitos de histórico/ownership.
- **Trocar somente no frontend:** backend continuaria resolvendo outro tenant.
- **Compartilhar cache/drafts por usuário:** pode exibir ou enviar dados da empresa errada.

## Critérios para B4-38/B4-39, se aprovadas

1. Backend/shared-types e migration idempotente primeiro; nenhum endpoint operacional aceita tenant arbitrário do
   cliente.
2. Testes cobrem a matriz do documento QA, especialmente mesmo usuário em A+B e sessões simultâneas.
3. Todos os repositórios/arquivos/filas/auditorias preservam `company_id`; relações cruzadas retornam 404/403.
4. Web e app cancelam requests, limpam/particionam cache e persistem empresa por sessão; fácil/completo compartilham
   contrato.
5. Convite existente não cria User duplicado e não troca tenant silenciosamente.
6. Matriz visual em `1440×900`, `390×844`, `360×800`, dois modos e app, incluindo draft aberto, vínculo removido,
   troca lenta/offline e duas sessões.
7. Billing, plano, dados de produção e lojas não mudam nesta implementação sem nova aprovação.

## Consequências

**Positivas**

- O schema relacional atual é reaproveitado e papéis continuam por empresa.
- Empresa ativa fica explícita, testável e independente por sessão.
- Convites atendem pessoas já cadastradas sem duplicar identidade.
- Tokens, cache e UI passam a concordar sobre o tenant.

**Trade-offs**

- Autenticação ganha estado de sessão e fluxo de seleção.
- Troca exige invalidar caches/drafts e tratar requisições em andamento.
- Sessões legadas precisam de migração ou novo login seguro.
- Todos os testes tenant-scoped devem ganhar o cenário de mesmo usuário em múltiplas empresas.
