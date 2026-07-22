# SOLICITAÇÃO — Completar Design das Telas Operacionais do Orcivo

## Contexto

O design system principal já foi criado para o Orcivo, com:

```text
- cores white / black / purple
- tipografia
- tokens
- botões
- inputs
- cards
- badges
- empty states
- logo/mark placeholder
- Web Dashboard
- Mobile Home
- parte do UI Kit mobile/web
```

Porém ainda faltam telas operacionais importantes que fazem parte do produto e precisam ser desenhadas para o front ficar realmente completo.

Este documento deve ser enviado ao Claude Design/Claude Code para continuar o trabalho.

---

## Objetivo

Completar o design mobile e web das áreas operacionais do Orcivo, mantendo o design system já criado.

Não refazer o design system.

Não mudar a identidade visual.

Não trocar as cores.

Não criar nova marca.

Apenas continuar e completar as telas faltantes.

---

## Decisões já confirmadas

```text
Produto: Orcivo
Visual: white / black / purple
Primary: --purple-600 #6D28D9
Mobile-first, mas com web app completo
Mobile frame principal: Android
Web: dashboard administrativo limpo, sem parecer ERP pesado
Idioma: pt-BR
Ícones: Lucide
Fonte: Inter
Logo atual: placeholder
```

---

# Telas Mobile que precisam ser adicionadas

## 1. Mobile app — Operação / Mais

Criar uma tela mobile chamada:

```text
Mobile app — Operação / Mais
```

Ela deve listar os principais módulos que não cabem na bottom tab.

### Itens

```text
Ordens de Serviço
Catálogo
Financeiro
Documentos
Conta
Configurações
Usuários e permissões
Plano e assinatura
Ajuda e suporte
```

### Requisitos visuais

```text
- lista com ícones Lucide;
- cada item em card/row clicável;
- descrição curta abaixo do título;
- badge quando houver pendência;
- plano atual visível em um card no topo ou no final;
- não deixar aparência de lista genérica;
- visual consistente com Mobile Home.
```

### Exemplo de conteúdo

```text
Ordens de Serviço
Acompanhe serviços abertos, em execução e finalizados.

Catálogo
Gerencie seus serviços, produtos e mão de obra.

Financeiro
Controle recebimentos, pendências e recibos.

Documentos
Acesse orçamentos, recibos, relatórios e contratos.

Usuários e permissões
Gerencie quem pode acessar a empresa.

Plano PRO
Próxima cobrança em 28/05 · R$ 89,90
Ver detalhes do plano
```

---

## 2. Mobile app — Ordens de Serviço

Criar telas/cards:

```text
Mobile app — Ordens de Serviço
Mobile app — Detalhe da OS
```

### Lista de OS

Deve conter:

```text
- busca;
- filtro por status;
- cards de OS;
- CTA para nova OS;
- empty state;
- status badges.
```

### Status

```text
Aberta
Agendada
Em execução
Aguardando cliente
Aguardando material
Finalizada
Cancelada
```

### Card de OS

Exemplo:

```text
OS #1024
Instalação de câmera
Cliente: Mercado São João
Hoje · 14:30
Status: Em execução
Técnico: João
```

### Detalhe da OS

Seções:

```text
Resumo
Cliente
Execução
Materiais usados
Fotos
Assinatura
Financeiro
Histórico
```

Ações:

```text
Iniciar execução
Adicionar foto
Adicionar material
Coletar assinatura
Finalizar OS
Gerar relatório
Registrar recebimento
```

---

## 3. Mobile app — Catálogo

Criar telas/cards:

```text
Mobile app — Catálogo
Mobile app — Novo item do catálogo
```

### Lista

Abas:

```text
Serviços
Produtos
Mão de obra
Outros
```

Card:

```text
Instalação de câmera
Serviço
R$ 180,00
Ativo
```

Ações:

```text
Novo item
Editar
Duplicar
Inativar
```

### Formulário

Campos:

```text
Tipo
Nome
Descrição
Unidade
Preço
Ativo
```

---

## 4. Mobile app — Financeiro

Criar telas/cards:

```text
Mobile app — Financeiro
Mobile app — Registrar recebimento
```

### Resumo

Cards:

```text
Recebido no mês
Pendente
Vencido
```

### Lista

Itens:

```text
cliente;
origem: orçamento/OS;
valor;
status;
vencimento;
método.
```

### Filtros

```text
Período
Status
Método
Cliente
```

### Registrar recebimento

Campos:

```text
Cliente
OS/orçamento vinculado
Valor
Método
Vencimento
Pago em
Observações
```

---

## 5. Mobile app — Documentos

Criar tela:

```text
Mobile app — Documentos
```

### Tipos

```text
Orçamentos
Ordens de Serviço
Recibos
Relatórios
Contratos
```

### Lista

Card:

```text
Orçamento #2031
Cliente: Ana Martins
PDF gerado em 10/05
Ações: visualizar, compartilhar, baixar
```

### Estados

```text
sem documentos;
erro ao carregar;
carregando.
```

---

## 6. Mobile app — Conta

Criar tela:

```text
Mobile app — Conta
```

Conteúdo:

```text
Nome do usuário
Email
Telefone
Empresa atual
Segurança
2FA
Sair
```

Ações:

```text
Editar perfil
Alterar senha
Ativar 2FA
Sair da conta
```

---

## 7. Mobile app — Configurações

Criar tela:

```text
Mobile app — Configurações
```

Seções:

```text
Empresa
Identidade visual
Chave Pix
Preferências
Notificações
Exportação de dados
Suporte
```

Card de identidade visual:

```text
Logo
Cor principal
Nome fantasia
Dados no documento
```

---

## 8. Mobile app — Usuários e permissões

Criar tela:

```text
Mobile app — Usuários e permissões
```

### Lista de usuários

Card:

```text
João Pereira
Técnico
Ativo
Permissões: clientes atribuídos, criar OS
```

### Ações

```text
Convidar usuário
Editar permissões
Desativar acesso
```

### Tela de permissões

Agrupar permissões:

```text
Clientes
Orçamentos
Ordens de Serviço
Financeiro
Catálogo
Agenda
Administração
```

Usar switches/checks.

---

## 9. Mobile app — Plano e assinatura

Criar tela:

```text
Mobile app — Plano e assinatura
```

### Card principal

```text
Plano PRO
Próxima cobrança em 28/05 · R$ 89,90
Status: Ativo
```

Ações:

```text
Ver detalhes do plano
Regularizar assinatura
Alterar plano
Histórico de pagamentos
```

### Observação App Store

No mobile, usar linguagem neutra.

Não usar:

```text
Assine fora do app
Evite taxa da Apple
Compre mais barato no site
```

Usar:

```text
Sua assinatura é gerenciada pelo painel da sua conta.
Acesse o painel para regularizar ou alterar seu plano.
```

---

# Telas Web que precisam ser adicionadas/completadas

## 10. Web app — Ordens de Serviço

Criar:

```text
Web app — Ordens de Serviço
Web app — Detalhe da OS
```

### Lista/tabela

Colunas:

```text
Número
Cliente
Serviço
Técnico
Status
Agendada para
Finalizada em
Ações
```

Filtros:

```text
Status
Técnico
Período
Cliente
```

Ações:

```text
Nova OS
Abrir
Duplicar
Gerar relatório
```

---

## 11. Web app — Catálogo

Criar:

```text
Web app — Catálogo
```

Tabela:

```text
Tipo
Nome
Unidade
Preço
Status
Ações
```

Filtros:

```text
Tipo
Ativo/inativo
Busca
```

Ações:

```text
Novo item
Editar
Duplicar
Inativar
```

---

## 12. Web app — Financeiro

Criar:

```text
Web app — Financeiro
```

Cards superiores:

```text
Recebido no período
Pendente
Vencido
Ticket médio
```

Tabela:

```text
Cliente
Origem
Valor
Método
Status
Vencimento
Pago em
Ações
```

Filtros:

```text
Período
Status
Método
Cliente
```

TOP pode mostrar gráfico simples, mas não exagerar.

---

## 13. Web app — Documentos

Criar:

```text
Web app — Documentos
```

Conteúdo:

```text
lista de PDFs gerados;
orçamentos;
OS;
recibos;
relatórios;
contratos.
```

Tabela:

```text
Tipo
Número
Cliente
Gerado em
Status
Ações
```

Ações:

```text
Visualizar
Baixar
Compartilhar
Copiar link
```

---

## 14. Web app — Configurações

Criar:

```text
Web app — Configurações
```

Sidebar interna ou tabs:

```text
Empresa
Identidade visual
Chave Pix
Usuários e permissões
Plano e assinatura
Segurança
Exportação de dados
Notificações
```

### Empresa

Campos:

```text
Nome fantasia
Razão social
CPF/CNPJ
Telefone
Email
Endereço
```

### Identidade visual

```text
Logo
Cor principal
Preview de documento
```

### Chave Pix

```text
Tipo de chave
Chave
Nome do recebedor
```

---

## 15. Web app — Usuários e permissões

Criar:

```text
Web app — Usuários e permissões
```

Tabela:

```text
Nome
Email
Função
Status
Último acesso
Ações
```

Drawer/modal para permissões:

```text
Clientes
Orçamentos
OS
Financeiro
Catálogo
Agenda
Administração
```

Ações:

```text
Convidar usuário
Editar permissões
Desativar
Reenviar convite
```

---

## 16. Web app — Plano e assinatura

Criar:

```text
Web app — Plano e assinatura
```

### Card principal

```text
Plano PRO
Próxima cobrança em 28/05 · R$ 89,90
Status: Ativo
```

### Conteúdo

```text
uso do plano;
usuários ativos;
armazenamento;
NF usadas se disponível;
histórico de pagamentos;
botões alterar plano, regularizar, cancelar.
```

### Cards de planos

Mostrar:

```text
Grátis
POP
PRO
TOP
```

Com comparação resumida.

---

## 17. Web app — Dashboard de Operação

Criar uma versão mais operacional do dashboard além do card genérico inicial.

### Deve conter

```text
agenda de hoje;
OS em execução;
orçamentos pendentes;
recebimentos pendentes;
ações rápidas;
alertas de plano;
últimas atividades.
```

Ações rápidas:

```text
Novo cliente
Novo orçamento
Nova OS
Novo compromisso
Registrar recebimento
```

---

# Ajuste na navegação

## Mobile

Bottom tab continua:

```text
Início
Clientes
Orçamentos
Agenda
Mais
```

Dentro de Mais/Operação:

```text
Ordens de Serviço
Catálogo
Financeiro
Documentos
Conta
Configurações
Usuários e permissões
Plano e assinatura
Ajuda
```

## Web

Sidebar principal:

```text
Dashboard
Clientes
Catálogo
Orçamentos
Ordens de Serviço
Agenda
Financeiro
Documentos
Configurações
```

Configurações inclui:

```text
Empresa
Identidade visual
Usuários e permissões
Plano e assinatura
Segurança
Exportação de dados
```

---

# Regras visuais

Manter:

```text
white / black / purple
primary --purple-600 #6D28D9
Inter
Lucide
cards limpos
status badges
sem emoji
sem ERP pesado
```

A operação precisa parecer:

```text
profissional;
organizada;
prática;
com boa densidade;
fácil de usar por técnico;
boa para PC e celular.
```

Não criar:

```text
visual novo;
paleta nova;
logo novo;
tema escuro agora;
site de marketing;
slide deck;
fiscal;
estoque avançado.
```

---

# Critérios de aceite

A entrega estará correta quando existirem cards/telas de design para:

```text
Mobile app — Operação / Mais
Mobile app — Ordens de Serviço
Mobile app — Detalhe da OS
Mobile app — Catálogo
Mobile app — Financeiro
Mobile app — Documentos
Mobile app — Conta
Mobile app — Configurações
Mobile app — Usuários e permissões
Mobile app — Plano e assinatura

Web app — Ordens de Serviço
Web app — Detalhe da OS
Web app — Catálogo
Web app — Financeiro
Web app — Documentos
Web app — Configurações
Web app — Usuários e permissões
Web app — Plano e assinatura
Web app — Dashboard de Operação
```

Cada tela deve ter:

```text
estado normal;
empty state quando aplicável;
loading/error se for lista;
ações principais;
status badges;
respeito ao design system.
```

---

# Prompt curto para executar

```text
Continue o design system do Orcivo.

Não refaça o que já foi criado.

Faltam telas operacionais importantes. Use o arquivo OPERATIONS_UI_MISSING_SPECS.md como fonte de verdade.

Crie os cards/telas faltantes para mobile e web:
- Operação/Mais
- Ordens de Serviço
- Catálogo
- Financeiro
- Documentos
- Conta
- Configurações
- Usuários e permissões
- Plano e assinatura
- Dashboard operacional web

Mantenha:
- white / black / purple
- --purple-600 #6D28D9
- Inter
- Lucide
- pt-BR
- visual profissional, limpo e sem cara de ERP pesado

Não implemente código. Gere apenas os designs/cards/telas.
```
