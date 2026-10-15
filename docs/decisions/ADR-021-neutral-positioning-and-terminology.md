# ADR-021 — Posicionamento neutro, nomenclatura e onboarding

**Status:** Aprovado pelo dono em 2026-10-15 — gate B4-33 formalizado após a conclusão da B4-44
**Data:** 2026-10-14
**Relacionado:** B4-29 (levantamento), B4-30 (multiempresa), B4-37 (implementação condicionada), ADR-019

## Decisão do dono — 2026-10-15

- adotar posicionamento amplo para empresas e profissionais que gerenciam clientes, serviços, produtos, orçamentos e recebimentos;
- usar “Membro” como rótulo público do papel interno `TECNICO`;
- usar “Responsável pelo serviço”/“Responsável” como fallback configurável pela empresa;
- coletar nicho e objetivos de forma progressiva; profissão/cargo pertence ao vínculo pessoa–empresa e tratamento à pessoa;
- permitir termo profissional da empresa nos documentos quando aplicável, preservando snapshots históricos;
- não alterar Termos/Privacidade nem ampliar coleta LGPD nesta onda.

## Contexto

O Orcivo nasceu posicionado para técnicos instaladores, mas os fluxos atuais — clientes, serviços, produtos,
orçamentos, OS e recebimentos — atendem empresas e profissionais de vários nichos. A linguagem pública e parte da UI
ainda tratam profissão, papel de acesso, pessoa responsável pelo serviço e pessoa que assina documentos como se fossem
o mesmo conceito.

O inventário `docs/qa/B4-29-NEUTRAL-TERMS-INVENTORY.md` encontrou 488 linhas na varredura ampla e 116 linhas de
código de produto após excluir testes/specs. A maior concentração de copy diretamente problemática está na landing,
metadata/auth, equipe, retorno de aprovação e rodapé do PDF. Muitos outros casos são identificadores compatíveis,
códigos de papel ou usos adjetivos legítimos como “laudo técnico”.

Esta ADR não altera textos, schema, permissões, documentos nem onboarding. Ela define a direção e separa as escolhas
que exigem o dono.

## Decisão proposta

### 1. Posicionamento padrão

Posicionar o Orcivo como **gestão de clientes, serviços, produtos, orçamentos, ordens de serviço e recebimentos para
empresas e profissionais de serviços**. A comunicação pode citar instaladores, manutenção, assistência, reformas e
outros nichos como exemplos, sem eleger um deles como identidade obrigatória do produto.

Princípios de copy:

- falar com “você”, “sua empresa”, “seu negócio” e “sua equipe” conforme o contexto;
- usar “profissional” apenas quando a pessoa, e não a empresa, for relevante;
- usar “prestador de serviço” somente em textos formais onde “empresa ou profissional” ficaria longo;
- não trocar tudo mecanicamente por “responsável”: escolher o conceito correto;
- preservar termos técnicos legítimos de uma atividade ou documento.

### 2. Vocabulário canônico

| Conceito                      | Padrão neutro                          | Personalizável                          | Não inferir como      |
| ----------------------------- | -------------------------------------- | --------------------------------------- | --------------------- |
| pessoa que pertence à empresa | Membro / membro da equipe              | não                                     | profissão             |
| papel sem administração       | Membro                                 | rótulo futuro, se aprovado              | técnico por profissão |
| pessoa atribuída à OS         | Responsável pelo serviço / Responsável | `service_owner_term` da empresa         | emissor/assinante     |
| pessoa que assina documento   | Assinatura / Assinatura do emissor     | termo profissional somente se explícito | responsável da OS     |
| empresa que usa o Orcivo      | Empresa / negócio                      | nome e nicho existentes                 | técnico individual    |
| pessoa/empresa atendida       | Cliente                                | não                                     | usuário do Orcivo     |
| documento LAUDO               | Laudo técnico                          | título de documento já existente        | papel de usuário      |

O fallback obrigatório para atribuição é **Responsável pelo serviço**; em espaços curtos, **Responsável**. O fallback
para documentos é simplesmente **Assinatura**, evitando afirmar profissão ou vínculo que o sistema não conhece.

### 3. Preferências e escopo dos dados

Proposta de configuração, sem implementação nesta ADR:

| Preferência                       | Escopo recomendado     | Tipo/validação                              | Default                |
| --------------------------------- | ---------------------- | ------------------------------------------- | ---------------------- |
| nicho da empresa                  | empresa                | código de catálogo + “outro” opcional       | não informado          |
| objetivos no Orcivo               | empresa                | lista de códigos estáveis                   | lista vazia            |
| termo do responsável pelo serviço | empresa                | texto curto, seguro para UI/PDF             | Responsável            |
| termo profissional em documentos  | empresa                | texto curto opcional                        | vazio; usar Assinatura |
| profissão/cargo da pessoa         | vínculo pessoa–empresa | texto curto opcional                        | vazio                  |
| tratamento                        | usuário                | `NONE`, `SR`, `SRA`, `CUSTOM` + texto curto | NONE                   |

Nicho e objetivos ajudam onboarding/personalização, mas não mudam permissões nem regras do domínio. Termos livres devem
ter tamanho limitado, normalização de espaços, escape na renderização e proibição de HTML. Não usar o texto escolhido
como nome de campo, enum, autorização ou chave de auditoria.

A profissão é recomendada no vínculo pessoa–empresa, não globalmente no usuário: uma pessoa pode exercer papéis
diferentes em empresas diferentes. Essa escolha precisa ser confirmada junto da ADR de multiempresa B4-30 antes de
qualquer migration. Tratamento é preferência pessoal e não deve ser deduzido por nome, gênero ou profissão.

### 4. Aplicação por superfície

| Superfície           | Mudança condicionada à B4-33                        | Comportamento comum                                                 |
| -------------------- | --------------------------------------------------- | ------------------------------------------------------------------- |
| Landing/SEO/auth     | proposta ampla e exemplos de nichos                 | mesma promessa no title, description, manifest e auth               |
| Onboarding           | perguntar nicho/objetivos com opção de pular        | nenhum campo opcional bloqueia cadastro                             |
| Configurações        | editar termos da empresa e preferências pessoais    | preview mostra onde o termo será usado                              |
| Equipe/convites      | “Membro” e “Administrador”                          | código interno pode continuar `TECNICO` inicialmente                |
| OS                   | ADR-019: Responsável pelo serviço                   | snapshot/histórico não perde nome após desativação                  |
| Orçamento/recibo/PDF | copy neutra, sem rodapé nichado                     | termo efetivo precisa ser congelado quando fizer parte do documento |
| Aprovação pública    | “responsável pelo serviço entrará em contato”       | usa snapshot/default, não profissão do usuário logado               |
| E-mails              | manter “equipe/empresa”                             | não expor códigos `TECNICO` em auditoria/mensagem                   |
| Termos/Privacidade   | substituir persona por usuário/empresa controladora | tarefa separada, com aprovação LGPD explícita                       |

Os modos fácil/completo e web/app usam o mesmo contrato. A diferença é densidade, não vocabulário nem regra.

### 5. Compatibilidade de domínio

Recomendação: não renomear imediatamente o enum persistido `MemberRole.TECNICO`, campos
`technician_signature_*` nem storage keys. Eles não precisam aparecer para o usuário e uma renomeação agora aumenta
risco de migration, integração e histórico sem entregar valor visível.

A implementação deve introduzir uma camada única de apresentação para papéis e termos. Se depois for necessário
renomear o código para `MEMBER`, isso será uma migration idempotente própria, com compatibilidade de API e auditoria.

Quando um termo configurável aparece em documento emitido/enviado, salvar o valor efetivo junto do snapshot do
documento. Regenerar um orçamento ou recibo antigo após a empresa mudar “Responsável” para outro termo não pode
reescrever silenciosamente o documento histórico.

### 6. Amostras de copy, sem implementação

| Local      | Atual                                       | Proposta neutra                                  |
| ---------- | ------------------------------------------- | ------------------------------------------------ |
| SEO/hero   | Gestão para técnicos instaladores           | Gestão de serviços para o seu negócio            |
| Auth       | plataforma feita para técnicos instaladores | clientes, serviços e recebimentos em um só lugar |
| Equipe     | Convide técnicos e admins                   | Convide membros e administradores                |
| Papel      | Técnico                                     | Membro                                           |
| Aprovação  | o técnico responsável entrará em contato    | o responsável pelo serviço entrará em contato    |
| Assinatura | Assinatura do técnico                       | Assinatura                                       |
| PDF rodapé | gestão para técnicos instaladores           | gestão de serviços para empresas e profissionais |

As amostras preservam tipografia, componentes, Lucide e roxo `#6D28D9`; nenhuma propõe um novo design system.

## Decisões reservadas ao dono (B4-33)

1. Aprovar a frase de posicionamento ampla e as personas/nichos que aparecerão como exemplos.
2. Aprovar “Membro” como rótulo público do papel interno `TECNICO` ou escolher “Operação/Colaborador”.
3. Confirmar `Responsável pelo serviço`/`Responsável` como fallback e se a empresa poderá personalizá-lo livremente.
4. Aprovar os campos de onboarding: nicho, objetivos, profissão/cargo e tratamento; definir quais aparecem no cadastro
   inicial e quais ficam para depois.
5. Confirmar se profissão/cargo pertence ao vínculo pessoa–empresa após a ADR B4-30.
6. Aprovar se e onde o termo profissional da empresa aparece em orçamento, recibo e assinatura.
7. Autorizar separadamente qualquer alteração em Termos/Privacidade; a B4-37 não altera LGPD sem esse aceite.

## Alternativas descartadas

- **Troca global de “técnico” por “responsável”:** cria frases erradas e mistura profissão, permissão, atribuição e
  assinatura.
- **Renomear enum/keys junto da copy:** amplia risco técnico sem benefício ao usuário.
- **Profissão fixa no usuário:** não representa uma pessoa que participa de várias empresas/nichos.
- **Tratamento inferido por nome/gênero:** é impreciso e desnecessário; deve ser explícito e opcional.
- **Termo livre controlando autorização:** texto de apresentação nunca pode alterar RBAC.
- **Reescrever docs históricos/design handoff:** apaga contexto e pode alterar referência aprovada; usar nota de
  vocabulário vigente.

## Critérios para B4-37, se aprovada

1. Shared-types/backend primeiro para preferências aprovadas, com `company_id` nos dados empresariais e migration
   idempotente.
2. Mesma resolução de termos em site, web, app, e-mails e PDFs; fácil/completo não divergem.
3. Documentos congelam termos efetivos; registros antigos permanecem reproduzíveis.
4. Testes cobrem defaults, customização, texto vazio/inválido, escaping, isolamento por empresa e troca de empresa.
5. Checagem automatizada usa as categorias do inventário e falha para nova copy nichada não justificada.
6. Matriz visual cobre `1440×900`, `390×844`, `360×800`, dois modos e app; PDFs são renderizados e comparados.
7. Termos/Privacidade ficam fora até aprovação LGPD explícita.

## Consequências

**Positivas**

- Amplia aquisição sem desmontar os fluxos já validados.
- Separa profissão, permissão, responsabilidade e assinatura.
- Mantém compatibilidade técnica enquanto remove linguagem nichada das superfícies visíveis.
- Prepara personalização por empresa sem transformar copy em regra de negócio.

**Trade-offs**

- Copy e snapshots passam a depender de uma resolução de termos centralizada.
- Onboarding ganha perguntas opcionais que precisam ser curtas e adiáveis.
- Documentos históricos exigem snapshot do termo efetivo.
- A atualização legal precisa de uma aprovação separada.
