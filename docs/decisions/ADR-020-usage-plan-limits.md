# ADR-020 — Uso, limites e diferenciação dos planos

**Status:** Proposto — aguarda decisão do dono na B4-33  
**Data:** 2026-10-14  
**Relacionado:** B4-28 (levantamento), B4-34/B4-35/B4-36 (implementação condicionada)

## Contexto

O Orcivo já possui quatro planos (`Orcivo Livre`, `Orcivo Solo`, `Orcivo Mais` e `Orcivo Equipe`), limites
persistidos por plano e bloqueios no backend. Porém, o usuário só descobre parte do consumo perto ou depois do
bloqueio. A web mostra plano, assinatura, membros e pagamentos, mas não apresenta consumo. O app mostra apenas OS do
mês e reconstrói o número paginando a lista de OS; isso pode ficar incompleto e replica no frontend uma regra que
pertence ao backend.

A tarefa pede uma proposta de tela **Uso**, alertas antecipados e diferenciação por valor real. Ela não autoriza
alterar preços, billing, limites ou bloqueios. Essas escolhas continuam no gate do dono.

## Inventário atual

### Fonte e regras

| Dado/regra           | Fonte atual                       | Período atual          | Aplicação atual                                | Lacuna para a tela Uso                                                     |
| -------------------- | --------------------------------- | ---------------------- | ---------------------------------------------- | -------------------------------------------------------------------------- |
| Plano ativo          | `Company.plan_code`               | contínuo               | backend, site, web e app                       | contrato não identifica origem/instante do snapshot                        |
| Estado da assinatura | `Subscription.status`             | ciclo da assinatura    | bloqueia criação quando `BLOCKED`              | resposta de limites não traz início/fim do ciclo nem renovação             |
| Clientes             | `PlanLimit.customers_max`         | total ativo cadastrado | backend conta por `company_id` antes de criar  | endpoint não devolve usado/restante                                        |
| Orçamentos           | `PlanLimit.quotes_per_month`      | mês calendário         | backend conta `created_at` desde início do mês | endpoint não devolve usado/restante/reset                                  |
| OS                   | `PlanLimit.work_orders_per_month` | mês calendário         | backend conta `created_at` desde início do mês | app tenta recontar páginas; web não mostra uso                             |
| Membros              | `PlanLimit.members_max`           | membros da empresa     | backend conta por `company_id`                 | não explicita se inativos entram na contagem                               |
| Logo                 | `PlanLimit.has_logo`              | por plano              | divulgado no catálogo                          | ausência não é apresentada como disponibilidade estruturada                |
| Marca d'água         | `PlanLimit.pdf_watermark`         | por plano              | gate legado `PDF_WATERMARK`                    | sem estado estruturado de recurso na UI                                    |
| Relatórios           | `PlanLimit.has_reports`           | por plano              | bloqueio dedicado no backend                   | não aparece como disponível/bloqueado na conta                             |
| Contratos            | `PlanLimit.has_contracts`         | por plano              | divulgado                                      | recurso não deve ser prometido como utilizável sem confirmar implementação |
| Armazenamento/fotos  | inexistente                       | inexistente            | nenhum limite de plano inventariado            | não exibir número ou barra até existir medição real                        |

`packages/shared-types/src/billing/plans.ts` é a fonte compartilhada de catálogo e preços, e `PlanLimit` é a cópia
operacional semeada de forma idempotente. Hoje os valores são:

| Plano         |  Clientes | Orçamentos/mês |    OS/mês | Membros | Logo | Marca d'água | Relatórios | Contratos |
| ------------- | --------: | -------------: | --------: | ------: | ---- | ------------ | ---------- | --------- |
| Orcivo Livre  |         5 |             10 |        15 |       1 | não  | sim          | não        | não       |
| Orcivo Solo   |        50 |             50 |        30 |       1 | sim  | não          | não        | não       |
| Orcivo Mais   |       200 |      uso justo | uso justo |       3 | sim  | não          | sim        | não       |
| Orcivo Equipe | uso justo |      uso justo | uso justo |       8 | sim  | não          | sim        | sim       |

`null` significa **uso justo**, não “ilimitado”. A interface não deve usar “ilimitado”.

### Cobertura existente

- `GET /company/me/plan-limits` entrega limites e flags, mas não consumo, restante, período nem renovação.
- `GET /company/me/subscription-status` entrega status e mensagem operacional, sem datas do ciclo.
- A web `/plano` consulta assinatura, pagamentos e membros separadamente e não mostra clientes/orçamentos/OS usados.
- O app consulta os dois endpoints acima e conta até duas páginas de OS. Esse cálculo deve ser removido quando o
  backend expuser o snapshot de uso.
- Site, web e app derivam nomes/preços do shared-types. O site já testa que não exibe códigos internos nem
  “ilimitado”.
- Specs atuais cobrem o catálogo, o limite de OS e relatórios, mas não cobrem todos os quatro contadores, fronteiras
  de período, membros ativos/inativos nem consistência do snapshot.

## Decisão proposta

### 1. Contrato único calculado no backend

Criar em shared-types um contrato `PlanUsageResponse` e um endpoint tenant-scoped de leitura, sugerido como
`GET /company/me/usage`. O backend deve calcular todos os números; nenhuma superfície pode recontar listas ou
reconstruir regras do plano.

O snapshot deve conter:

- `plan`: código tipado, nome público, estado da assinatura e funcionalidades;
- `billing_period`: início/fim do ciclo quando houver assinatura e data de renovação conhecida;
- `usage_period`: início/fim/reset do mês calendário usado por orçamentos e OS;
- `resources[]`: código estável, rótulo pt-BR, `used`, `limit`, `remaining`, unidade, tipo de período e estado;
- `features[]`: código estável, rótulo e `AVAILABLE`, `LOCKED` ou `NOT_IMPLEMENTED`;
- `generated_at`: instante do snapshot para permitir atualização/revalidação.

Os estados de recurso são calculados pelo backend: `NORMAL` abaixo de 80%, `ATTENTION` de 80% a 99%, `REACHED` em
100% e `EXCEEDED` acima de 100%. Recursos de uso justo usam `limit: null`, `remaining: null` e `state: FAIR_USE`, sem
barra percentual enganosa. Se um contador não puder ser calculado, retornar `UNAVAILABLE`, nunca zero inventado.

Clientes devem seguir a mesma definição usada pelo bloqueio. Membros devem contar apenas os que efetivamente consomem
vaga; a implementação precisa alinhar esse filtro com convite/desativação antes de publicar o número. Todos os counts
continuam filtrados por `company_id`.

### 2. Tela Uso separada de cobrança

Adicionar **Uso** como destino claro no menu da conta/configurações. “Plano e assinatura” continua responsável por
pagamentos, ciclo e troca/cancelamento; Uso explica capacidade e consumo. Um link bidirecional conecta as telas.

Ordem do conteúdo:

1. resumo do plano, estado da assinatura, período e próxima renovação/reset;
2. cards de clientes, orçamentos, OS e membros, com usado/limite/restante;
3. funcionalidades disponíveis e bloqueadas;
4. alerta contextual e CTA “Comparar planos” somente quando útil;
5. armazenamento/fotos apenas quando houver medição e limite aprovados.

Estados de 80%, 100% e excedido não dependem apenas de cor: usar texto, ícone Lucide, valor e `aria`/rótulo acessível.
Manter os tokens e componentes existentes, inclusive roxo `#6D28D9`; não criar um design system paralelo.

### 3. Indicadores nas telas relacionadas

Clientes, orçamentos, OS e equipe podem mostrar um indicador compacto vindo do mesmo contrato, por exemplo
“8 de 10 neste mês”. Em `ATTENTION`, mostrar aviso antes da criação; em `REACHED`, explicar o bloqueio antes de o
usuário preencher o formulário e preservar acesso a consulta/exportação. O backend permanece a autoridade final para
evitar corrida entre sessões.

Não buscar o snapshot a cada linha ou interação. A tela Uso faz uma leitura; indicadores relacionados reutilizam um
resumo cacheável e revalidam após uma criação bem-sucedida ou ao retornar ao foco. Isso também mantém o app abaixo de
uma cadência agressiva de requisições.

### 4. Wireframes descritivos

**Desktop completo e fácil**

```text
[Uso]                                      [Comparar planos]
[Orcivo Solo · Ativo] [Renova em dd/mm] [Uso reinicia em dd/mm]

[Clientes  38/50] [Orçamentos 42/50] [OS 24/30] [Membros 1/1]
[barra + usado, restante, período; alerta textual quando >= 80%]

Funcionalidades do plano
[✓ Logo própria] [✓ PDF sem marca d'água] [— Relatórios] [— Contratos]
```

Em web mobile e app, os cards viram uma coluna, sem tabela horizontal. O modo fácil usa frases curtas e um único CTA;
o modo completo pode detalhar período e funcionalidades, mas recebe exatamente os mesmos números. No app, o CTA abre
o fluxo web já adotado, sem implementar compra dentro do app nesta decisão.

### 5. Limites e diferenciação recomendados para avaliação

Recomendação técnica: manter por enquanto os quatro limites já aplicados (clientes, orçamentos/mês, OS/mês e membros)
e as flags existentes, tornando-os visíveis antes de mudar valores. Não criar limite de armazenamento/fotos até haver
telemetria de volume, custo e retenção. Não ativar `has_contracts` como promessa de produto antes de confirmar que o
fluxo existe ponta a ponta.

Possíveis diferenciais por valor real, sem degradar o básico:

- Livre: experimentar o fluxo completo em baixo volume, com marca d'água e sem logo própria;
- Solo: identidade da empresa e volume maior para uma pessoa;
- Mais: colaboração pequena, relatórios e uso justo para operação recorrente;
- Equipe: mais membros, contratos somente quando implementados e recursos de gestão/controle próprios de equipe.

Não se recomenda retirar recursos essenciais de criação, consulta, exportação dos próprios dados ou recebimentos do
plano básico apenas para forçar upgrade. Alertas antecipados e diferenças de colaboração/automação/gestão oferecem
valor mais defensável que bloqueios artificiais.

## Decisões reservadas ao dono (B4-33)

1. Confirmar ou alterar os valores atuais de clientes, orçamentos, OS e membros por plano.
2. Confirmar se `null` continua significando uso justo e qual política operacional acompanha eventual abuso.
3. Aprovar 80% como limiar de alerta e a linguagem dos CTAs de upgrade.
4. Definir se o mês calendário continua sendo o período de orçamentos/OS ou se deve acompanhar o ciclo da assinatura.
5. Definir se clientes arquivados e membros inativos consomem limite; a recomendação é não consumir.
6. Confirmar quais diferenciais serão comercialmente divulgados, especialmente contratos e eventuais limites futuros
   de armazenamento/fotos.
7. Aprovar qualquer remoção, elevação ou substituição de limite. A ADR não altera billing nem estratégia comercial.

## Alternativas descartadas

- **Frontend contar recursos:** produz números incompletos, multiplica requisições e replica regra de negócio.
- **Reutilizar apenas `/plan-limits`:** o nome e o contrato não comportam período, consumo e funcionalidades com
  semântica clara.
- **Misturar Uso e histórico de pagamentos numa tela extensa:** reduz a clareza e acopla capacidade operacional a
  billing.
- **Mostrar barra 0% para uso justo:** sugere ausência de uso ou capacidade infinita; usar texto e estado próprios.
- **Criar limites de fotos/armazenamento agora:** não existe medição confiável nem decisão comercial.
- **Bloquear no frontend:** não resolve concorrência e pode divergir entre web e app.

## Critérios para B4-34/B4-35/B4-36, se aprovadas

1. Backend/shared-types primeiro, com snapshot tenant-scoped e datas/períodos explícitos.
2. Specs cobrem quatro planos, `79%/80%/99%/100%/>100%`, uso justo, indisponível, virada de período e isolamento por
   `company_id`.
3. Web e app removem qualquer recontagem local e exibem os mesmos valores/estados nos modos fácil e completo.
4. Indicadores antecipam limite sem duplicar regras; a resposta final de criação continua sendo validada no backend.
5. Nenhum preço, limite, billing, loja ou texto comercial muda sem a decisão do dono.
6. Verificação visual em `1440×900`, `390×844`, `360×800`, nos dois modos e no app, incluindo carregando, erro,
   normal, 80%, 100%, excedido e uso justo.

## Consequências

**Positivas**

- O usuário conhece capacidade e restante antes de preencher um fluxo.
- Web e app deixam de divergir e o backend se torna fonte única dos números.
- A proposta comporta novos recursos sem inventar limites hoje.
- A separação entre Uso e cobrança reduz o risco de alterar billing nesta onda.

**Trade-offs**

- O snapshot exige contagens adicionais; a implementação deve medir consultas, indexação e cache.
- Período de uso e ciclo de assinatura podem ser datas diferentes e precisam de rótulos claros.
- Dados acima do limite após downgrade exigem estado `EXCEEDED`, acesso preservado e regra explícita para novas
  criações.
