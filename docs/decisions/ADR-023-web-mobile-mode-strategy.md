# ADR-023 — Estratégia dos modos no web mobile

**Status:** Aprovado pelo dono em 2026-10-15 — gate B4-33 formalizado após a conclusão da B4-44
**Data:** 2026-10-14
**Relacionado:** B4-31 (levantamento), B4-40 (implementação condicionada)

## Decisão do dono — 2026-10-15

- aprovada a opção C;
- modo fácil é a entrada recomendada para novos aparelhos no web mobile;
- modo completo permanece acessível, responsivo e alcançável por alternância/deep link;
- troca com alterações não salvas exige confirmação;
- telemetria agregada fica para tarefa futura e somente após avaliação de privacidade/LGPD.

## Contexto

O modo fácil é uma aplicação web com navegação própria em `/facil`; o modo completo é o conjunto de rotas autenticadas.
Hoje o usuário pode alternar em Configurações e o completo funciona como escape para recursos avançados iniciados no
fácil. O levantamento em `docs/qa/B4-31-WEB-MOBILE-MODE-INVENTORY.md` encontrou cobertura funcional relevante nos dois
modos, histórico recente de responsividade corrigida e nenhuma telemetria que demonstre preferência ou abandono.

Esta decisão é exclusiva do web mobile. Ela não muda nem presume nada sobre o app nativo.

## Opções avaliadas

### A. Ocultar o modo completo no web mobile

**Vantagem:** reduz escolhas visíveis e parece diminuir a matriz de navegação.

**Problemas:** equipe, relatórios, importação, plano e edições avançadas não têm toda a paridade no fácil; deep links
continuariam chegando às rotas completas; esconder não elimina manutenção responsiva e cria becos sem saída. Sem
telemetria, não há prova de que ocultar melhora conclusão.

### B. Manter ambos sem política adicional

**Vantagem:** preserva o comportamento atual com custo imediato baixo.

**Problemas:** perpetua troca pouco orientada, risco de perder draft e ausência de critério para decidir qual modo usar.
Também não define obrigação explícita de responsividade para o completo.

### C. Modo fácil como entrada recomendada, completo acessível e totalmente adaptado

**Vantagem:** mantém a experiência simples, preserva recursos avançados/deep links e transforma responsividade do
completo em requisito, não em exceção. É reversível e compatível com as correções já feitas.

**Custo:** mantém duas experiências e sua matriz de QA; requer proteção de alterações não salvas e orientação clara ao
abrir uma tela avançada.

## Decisão recomendada

Adotar a **opção C**:

1. No web mobile, o modo fácil é a entrada recomendada/padrão para novos aparelhos, sem redirecionar à força usuários
   que já escolheram o completo.
2. O modo completo permanece acessível por alternância explícita, deep link e “Mais opções”.
3. Toda rota completa alcançável no mobile deve cumprir a mesma matriz de responsividade e acessibilidade do Batch 4.
4. Alternar com alterações não salvas exige confirmação; dados já persistidos nunca são duplicados ou convertidos.
5. A tela avançada aberta a partir do fácil mantém retorno claro, sem cobrir CTA/safe area.
6. A preferência continua por aparelho nesta onda. Sincronização por usuário exige requisito separado.
7. Coleta futura de uso, se aprovada, deve ser mínima, agregada e submetida à avaliação de privacidade; não é condição
   para preservar o acesso atual.

## Comportamento proposto por situação

| Situação                        | Comportamento                                                                       |
| ------------------------------- | ----------------------------------------------------------------------------------- |
| primeiro acesso web mobile      | apresentar o fácil como recomendação, com acesso claro ao completo                  |
| usuário já escolheu um modo     | respeitar a preferência local                                                       |
| recurso não disponível no fácil | explicar “Abrir opções completas”, preservar contexto persistido e oferecer retorno |
| formulário alterado             | confirmar antes de trocar; cancelar mantém modo e conteúdo                          |
| deep link completo              | abrir a rota completa responsiva; não redirecionar silenciosamente ao fácil         |
| viewport desktop                | manter livre alternância; nenhuma decisão mobile remove o completo desktop          |
| app nativo                      | fora desta ADR                                                                      |

## Acessibilidade e QA

- nenhum modo é identificado somente por cor;
- controle de alternância tem nome/estado acessíveis e alvo confortável;
- foco vai para o título da nova tela e voltar funciona de forma previsível;
- zoom de texto, teclado e safe areas não escondem navegação ou ação;
- testes cobrem `1440×900`, `390×844`, `360×800`, fácil/completo, alternância no meio do fluxo e deep links;
- nenhuma tarefa fecha com base apenas em `scrollWidth`: legibilidade, ordem de foco e alcance do CTA também contam.

## Decisões reservadas ao dono (B4-33)

1. Aprovar a opção C ou escolher explicitamente A/B.
2. Aprovar o modo fácil como recomendação padrão apenas para novos aparelhos no web mobile.
3. Aprovar que o completo continue disponível por alternância e deep link no mobile.
4. Aprovar confirmação obrigatória ao trocar com alterações não salvas.
5. Decidir se telemetria agregada de modo/viewport deve virar uma tarefa futura, condicionada à avaliação LGPD.

## Consequências

**Positivas**

- não remove capacidades com base em suposição;
- aproveita a responsividade já corrigida;
- preserva acessibilidade, deep links e escolha consciente;
- separa claramente web mobile do app nativo.

**Trade-offs**

- as duas experiências continuam exigindo testes;
- a B4-40 precisa tratar draft, retorno e preferência, não apenas esconder um botão;
- a decisão poderá ser revista quando houver evidência real de uso.

## Critérios para B4-40, se aprovada

1. Implementar somente a opção aprovada e manter a mudança reversível.
2. Não alterar design system, app nativo ou regras de negócio.
3. Adicionar testes de preferência, alternância, deep link e alterações não salvas.
4. Repetir a matriz visual do inventário; o bloqueio atual do navegador integrado precisa estar resolvido.
5. Registrar separadamente qualquer futura coleta de métricas e sua decisão de privacidade.
