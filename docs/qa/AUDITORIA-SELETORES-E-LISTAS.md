# Auditoria de seletores e listas crescentes

Data: 2026-10-11

## Critério

Dados que crescem com o uso da empresa devem usar consulta limitada e busca. A interface mostra poucos resultados inicialmente e oferece **Ver mais**. Listas fechadas, como status, método de pagamento, período e unidade, permanecem como seletores simples.

## Resultado

| Superfície          | Fluxo                                             | Situação                                         | Ação                                                                       |
| ------------------- | ------------------------------------------------- | ------------------------------------------------ | -------------------------------------------------------------------------- |
| Web completo        | Novo recibo: cliente e vínculo OS/orçamento       | carregava até 500 clientes e 200 vínculos        | busca remota, limite inicial e Ver mais                                    |
| Web fácil           | Novo recibo/cobrança                              | carregava até 500 clientes e vínculos globais    | busca remota por cliente, vínculo filtrado pelo cliente, limite e Ver mais |
| App fácil           | Novo recibo/cobrança                              | carregava clientes e até 200 vínculos globais    | busca remota por cliente, vínculo filtrado pelo cliente, limite e Ver mais |
| Web completo        | Novo orçamento                                    | seletor nativo com todos os clientes carregados  | seletor pesquisável e paginado compartilhado                               |
| Web completo        | Nova OS                                           | busca local depois de carregar todos os clientes | busca remota, dez por página e Ver mais                                    |
| Web completo        | Agenda                                            | seletor nativo com até 200 clientes              | seletor pesquisável e paginado compartilhado                               |
| Web completo        | Registrar recebimento                             | seletor nativo com até 200 clientes              | seletor pesquisável e paginado compartilhado                               |
| Web fácil/app fácil | Clientes, orçamento e agenda                      | consultas amplas ou filtro somente local         | busca remota por nome/telefone, paginação e Ver mais                       |
| App completo        | Lista de clientes                                 | primeira página sem continuação explícita        | busca remota por nome/telefone, 20 por página e Ver mais clientes          |
| App completo        | Agenda e financeiro: vínculo com OS               | carregava até 100 OS de uma vez                  | busca remota por número/título, 10 por página e Ver mais                   |
| Web/app             | Históricos de auditoria                           | já usa cursor e limite                           | mantido                                                                    |
| Web/app             | Listas de orçamentos, serviços, recibos e avisos  | já usam paginação ou Ver mais                    | mantido                                                                    |
| Todas               | status, métodos, períodos, recorrência e unidades | vocabulário fechado e pequeno                    | mantido como seletor simples                                               |

## Regras técnicas

- Toda consulta continua limitada por `company_id` no backend.
- Busca de OS e orçamento aceita título e número; o vínculo do recibo também exige o cliente selecionado.
- Nenhuma regra financeira foi movida para o frontend.
- O componente web segue o design aprovado, usa Lucide, roxo `#6D28D9`, texto pt-BR e opções com alvo mínimo de 44 px.
- Respostas assíncronas antigas são descartadas para que uma busca rápida não
  seja sobrescrita por uma requisição anterior mais lenta.

## Evidência executada

- Backend: busca limitada por cliente, OS e orçamento coberta pelas specs de serviço.
- Web completa: novo orçamento, nova OS, agenda, financeiro e recibos conferidos com dados locais.
- Busca por telefone conferida no componente compartilhado: `1111` exibiu
  somente `Cliente Visual 11`; a busca vazia mostrou dez opções e “Ver mais”.
- Web fácil: clientes, orçamento e recibos conferidos com 25 clientes sintéticos.
- App completo: clientes, agenda e financeiro conferidos no Expo web.
- App fácil: clientes, orçamento e recibos conferidos no Expo web em 375×812.
- Resultado: nenhum seletor crescente auditado renderizou centenas de entidades; busca e continuação ficaram explícitas.
