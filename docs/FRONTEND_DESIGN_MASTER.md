# FRONTEND_DESIGN_MASTER.md



---

# 01 — Design System

## Direção visual

Produto: SaaS mobile + web para técnicos instaladores.

O design deve parecer:

```text
profissional;
simples;
moderno;
rápido;
confiável;
feito para campo;
não parecer ERP pesado;
não parecer app genérico de planilha;
não parecer ferramenta infantil.
```

## Princípios

```text
1. Técnico em campo usa com pressa.
2. Cada tela deve ter uma ação principal óbvia.
3. Evitar menus escondidos demais.
4. Status precisa ser visual.
5. Valores financeiros precisam ser legíveis.
6. Mobile prioriza ação rápida.
7. Web prioriza visão geral e gestão.
8. O mesmo vocabulário deve ser usado no mobile e na web.
9. Nada de UI poluída.
10. Não usar emoji em UI profissional.
```

## Nome provisório

Usar placeholder:

```text
[NOME_DO_APP]
```

Não fixar nome final no código/design.

## Paleta de cores

### Cores principais

```text
Primary / Azul técnico:
#2563EB

Primary dark:
#1D4ED8

Primary light:
#DBEAFE

Accent / Âmbar ação:
#F59E0B

Accent light:
#FEF3C7
```

### Neutros

```text
Slate 950: #020617
Slate 900: #0F172A
Slate 800: #1E293B
Slate 700: #334155
Slate 600: #475569
Slate 500: #64748B
Slate 400: #94A3B8
Slate 300: #CBD5E1
Slate 200: #E2E8F0
Slate 100: #F1F5F9
Slate 50:  #F8FAFC
White:     #FFFFFF
```

### Semânticas

```text
Success: #16A34A
Success bg: #DCFCE7

Warning: #D97706
Warning bg: #FEF3C7

Danger: #DC2626
Danger bg: #FEE2E2

Info: #0284C7
Info bg: #E0F2FE
```

## Status badges

### Orçamento

```text
DRAFT:
label: Rascunho
cor: Slate

PENDING:
label: Pendente
cor: Warning

APPROVED:
label: Aprovado
cor: Success

REJECTED:
label: Rejeitado
cor: Danger

EXPIRED:
label: Expirado
cor: Slate

CANCELLED:
label: Cancelado
cor: Slate
```

### Ordem de Serviço

```text
OPEN:
label: Aberta
cor: Info

SCHEDULED:
label: Agendada
cor: Primary

IN_PROGRESS:
label: Em execução
cor: Warning

WAITING_CUSTOMER:
label: Aguardando cliente
cor: Warning

WAITING_PARTS:
label: Aguardando material
cor: Warning

FINISHED:
label: Finalizada
cor: Success

CANCELLED:
label: Cancelada
cor: Danger
```

### Pagamento

```text
PENDING:
label: Pendente
cor: Warning

PAID:
label: Recebido
cor: Success

PARTIAL:
label: Parcial
cor: Info

OVERDUE:
label: Vencido
cor: Danger

CANCELLED:
label: Cancelado
cor: Slate
```

## Tipografia

### Web

```text
Fonte principal:
Inter

Fallback:
system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif
```

### Mobile

```text
Fonte:
System default

iOS:
San Francisco

Android:
Roboto
```

### Escala

```text
Display:
32/40, weight 700

H1:
28/36, weight 700

H2:
24/32, weight 700

H3:
20/28, weight 600

Body:
16/24, weight 400

Body small:
14/20, weight 400

Caption:
12/16, weight 400

Button:
14/20 ou 16/24, weight 600
```

## Espaçamento

Base 4px.

```text
xs: 4
sm: 8
md: 12
lg: 16
xl: 24
2xl: 32
3xl: 48
```

Mobile:

```text
screen padding: 16
card padding: 16
bottom safe area: respeitar
touch target mínimo: 44x44
```

Web:

```text
page padding: 24-32
sidebar width: 260
content max width em formulários: 960
cards gap: 16-24
```

## Bordas e sombras

```text
radius-sm: 8
radius-md: 12
radius-lg: 16
radius-xl: 20
radius-2xl: 24
```

Uso:

```text
inputs: 12
cards: 16
modals: 20
bottom sheets mobile: 24 top radius
```

Sombras:

```text
Card shadow:
0 1px 3px rgba(15, 23, 42, 0.08)

Modal shadow:
0 20px 40px rgba(15, 23, 42, 0.18)
```

## Ícones

Usar Lucide.

```text
Mobile:
lucide-react-native

Web:
lucide-react
```

Ícones principais:

```text
Home
Users
FileText
ClipboardList
Calendar
DollarSign
Package
Settings
Search
Plus
ChevronRight
Camera
PenLine
Share2
Download
Upload
Bell
CheckCircle
AlertCircle
XCircle
Lock
```

## Layout mobile

Bottom tab com 5 itens:

```text
Início
Clientes
Orçamentos
Agenda
Mais
```

Em "Mais":

```text
Ordens de Serviço
Catálogo
Financeiro
Configurações
Ajuda
```

Ação flutuante contextual:

```text
+ Cliente
+ Orçamento
+ Agendamento
```

Regra:

```text
Evitar mais de 5 tabs.
Tela crítica sempre com CTA principal fixo.
```

## Layout web

Web usa sidebar fixa.

Menu:

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

TOP pode exibir:

```text
Estoque
Contratos
Relatórios
```

Header:

```text
Busca global
Empresa atual
Notificações
Usuário
```

## Estados obrigatórios

Toda tela deve ter:

```text
Loading
Empty state
Error state
Permission denied
Blocked by plan
Offline/Sync pending no mobile
```

## Acessibilidade

```text
contraste AA;
touch targets >= 44px;
labels em inputs;
não depender só de cor;
texto legível em campo;
suporte a fontes maiores;
foco visível no web.
```

## Tom visual dos documentos PDF

PDF deve ser mais formal que a UI.

```text
cabeçalho com logo e dados da empresa;
título claro;
dados do cliente;
tabela de itens;
total destacado;
termos;
campo de assinatura;
rodapé profissional.
```


---

# 02 — Frontend Architecture

## Objetivo

Definir como mobile e web devem ser estruturados para compartilhar conceitos, tipos, padrões visuais e lógica de front sem duplicar regra de negócio.

## Apps

```text
apps/mobile:
React Native + Expo

apps/web:
Next.js App Router

apps/site:
Landing/pricing/checkout

apps/admin:
Admin master interno, depois da fase inicial

packages/shared-types:
DTOs, Zod schemas, enums

packages/ui:
componentes compartilháveis quando fizer sentido
```

## Regra central

```text
Backend é fonte única de regra de negócio.
Mobile e web nunca duplicam regra crítica.
Mobile e web consomem a mesma API.
Money sempre string decimal no JSON.
Mobile e web usam Decimal.js para preview.
```

## Estado e data fetching

### Mobile

```text
TanStack Query para server state
Zustand para estado local simples
MMKV para storage rápido
WatermelonDB ou SQLite apenas se cache offline crescer
React Hook Form + Zod para formulários
```

### Web

```text
TanStack Query ou fetch server actions com cuidado
React Hook Form + Zod
Zustand apenas para estado global leve
```

Regra:

```text
Começar simples.
Não criar Redux.
Não criar state machine complexa no MVP.
```

## Shared types

`packages/shared-types` pode conter:

```text
enums;
DTO interfaces;
Zod schemas;
tipos de status;
formatters puros;
constantes de plano.
```

Proibido:

```text
importar Prisma;
importar NestJS;
importar React;
importar React Native;
acessar env;
ter regra de negócio persistente.
```

## Design tokens

Criar tokens em:

```text
packages/ui/tokens
```

Exemplo:

```text
colors.ts
spacing.ts
radius.ts
typography.ts
status.ts
```

Mobile e web podem importar tokens, mas componentes podem ser separados quando necessário.

## Estrutura mobile

```text
apps/mobile/src/
  app/
    navigation/
    providers/
  features/
    auth/
    companies/
    customers/
    catalog/
    quotes/
    work-orders/
    appointments/
    finance/
    settings/
  shared/
    components/
    hooks/
    utils/
    api/
    forms/
    feedback/
  core/
    theme/
    storage/
    query/
    config/
```

## Estrutura web

```text
apps/web/
  app/
    (auth)/
      login/
      signup/
      forgot-password/
    (app)/
      dashboard/
      customers/
      catalog/
      quotes/
      work-orders/
      appointments/
      finance/
      settings/
  components/
    layout/
    common/
    forms/
    domain/
  lib/
    api/
    auth/
    formatters/
    query/
    permissions/
```

## Navegação mobile

Stack + tabs.

```text
AuthStack:
Login
Signup
ForgotPassword
VerifyEmail

OnboardingStack:
CreateCompany
BrandSetup
PixSetup

MainTabs:
Home
Customers
Quotes
Appointments
More

Nested:
CustomerDetail
QuoteEditor
QuoteDetail
WorkOrderDetail
Catalog
Finance
Settings
```

## Navegação web

Rotas principais:

```text
/auth/login
/auth/signup
/auth/forgot-password
/app/dashboard
/app/customers
/app/customers/new
/app/customers/[id]
/app/catalog
/app/quotes
/app/quotes/new
/app/quotes/[id]
/app/work-orders
/app/work-orders/[id]
/app/appointments
/app/finance
/app/settings/company
/app/settings/members
/app/settings/branding
/app/settings/billing
```

## API client

Criar cliente único:

```text
apps/mobile/src/shared/api/client.ts
apps/web/lib/api/client.ts
```

Regras:

```text
injetar access token;
injetar X-Company-Id;
mobile injeta X-Client-Request-Id em mutations;
tratar 401;
tratar 402 subscription blocked;
tratar 403 permission denied;
tratar 423 edit locked;
tratar erros com mensagem amigável.
```

## Erros padronizados

API deve retornar erros assim:

```json
{
  "code": "QUOTE_LOCKED",
  "message": "Este orçamento está sendo editado por outro usuário.",
  "details": {
    "locked_by": "João",
    "expires_at": "..."
  }
}
```

Front deve mapear:

```text
401 → voltar login
402 → tela/banner assinatura pendente
403 → sem permissão
404 → não encontrado
423 → lock de edição
500 → erro inesperado
```

## Permissões no front

Front pode esconder botões, mas não é fonte de segurança.

```text
Backend sempre valida.
Front melhora UX.
```

Criar helpers:

```text
canCreateQuote()
canViewFinance()
canManageMembers()
canEmitInvoice()
```

## Plano e feature gates

Front recebe:

```text
GET /me/plan-limits
GET /me/features
```

UI deve mostrar:

```text
Recurso disponível no plano PRO
Fazer upgrade
```

Mas não deve ser agressiva no app mobile por causa das lojas.

## Offline e sincronização

Mobile:

```text
mostrar banner "Sem conexão";
permitir rascunhos;
mostrar "pendente de sincronização";
não mentir que foi salvo no servidor;
reusar X-Client-Request-Id.
```

Web:

```text
sem suporte offline;
mostrar erro de conexão;
retry manual.
```

## Qualidade front

Antes de merge:

```text
mobile e web buildam;
sem TypeScript errors;
telas têm loading/empty/error;
formulários têm validação;
acessibilidade básica;
componentes seguem design system;
não existe regra de negócio duplicada;
não existe money como number em payload.
```


---

# 03 — UX Flows

## Fluxo de autenticação

### Login

```text
Abrir app/web
→ Tela de login
→ Email e senha
→ Se 2FA ativo, pedir código
→ Selecionar empresa se usuário tiver mais de uma
→ Entrar no dashboard/home
```

Estados:

```text
loading;
credenciais inválidas;
email não verificado;
conta bloqueada;
sem empresa;
assinatura pendente.
```

### Cadastro

```text
Criar conta
→ Nome, email, telefone, senha
→ Verificar email
→ Criar empresa
→ Configurar logo/cor depois ou pular
→ Entrar no plano Grátis ou tela de escolha de plano
```

## Fluxo de criação de empresa

```text
Nome fantasia
→ Tipo: CPF ou CNPJ
→ Documento
→ Telefone
→ Cidade/UF
→ Cor da marca
→ Logo opcional
→ Chave Pix opcional
→ Concluir
```

Regra:

```text
Não obrigar tudo no primeiro acesso.
Permitir "configurar depois".
```

## Fluxo Cliente

```text
Listar clientes
→ Buscar cliente
→ Abrir detalhe
→ Ver histórico
→ Criar orçamento
→ Criar OS manual
→ Criar agendamento
```

Criar cliente:

```text
Nome obrigatório
Tipo PF/PJ opcional
CPF/CNPJ opcional no início
Telefone recomendado
Endereço opcional
Observações internas opcional
```

## Fluxo Catálogo

```text
Listar itens
→ Filtrar por Produto/Serviço/Mão de obra
→ Criar item
→ Usar item em orçamento
```

Campos:

```text
tipo;
nome;
descrição;
unidade;
preço unitário;
ativo/inativo.
```

## Fluxo Orçamento

```text
Escolher cliente
→ Adicionar itens do catálogo ou avulsos
→ Ajustar quantidades e descontos
→ Definir validade
→ Termos/observações
→ Pré-visualizar total
→ Salvar rascunho
→ Gerar PDF
→ Enviar por WhatsApp
→ Marcar como enviado
```

Aprovação:

```text
Cliente aprova por link
OU usuário marca aprovado manualmente
→ Sistema cria OS automaticamente
→ Exibir link para OS criada
```

Rejeição:

```text
Marcar como rejeitado
→ Motivo opcional
→ Manter histórico
```

## Fluxo Ordem de Serviço

```text
OS criada de orçamento aprovado ou manual
→ Atribuir técnico
→ Agendar
→ Iniciar execução
→ Adicionar materiais usados
→ Adicionar fotos antes/depois
→ Coletar assinatura
→ Finalizar
→ Gerar PDF final
→ Registrar recebimento
```

## Fluxo Agenda

```text
Abrir agenda
→ Ver dia/semana
→ Criar compromisso
→ Vincular cliente/OS/orçamento
→ Definir técnico
→ Definir lembrete
→ Receber notificação
→ Marcar como concluído/cancelado
```

## Fluxo Financeiro

```text
Listar recebimentos
→ Filtrar por período/status
→ Registrar recebimento
→ Vincular cliente/OS/orçamento
→ Marcar como recebido
→ Ver resumo
```

MVP:

```text
receitas manuais;
sem contas a pagar;
sem conciliação bancária.
```

## Fluxo Web

Web deve facilitar operação em tela maior:

```text
dashboard;
tabelas;
filtros;
formulários longos;
configurações;
gestão de catálogo;
agenda com calendário;
financeiro com visão de período.
```

## Fluxo de assinatura

```text
Usuário no site escolhe plano
→ Checkout Asaas
→ Pagamento confirmado
→ Empresa ativa
```

No app:

```text
se assinatura pendente:
mostrar aviso neutro;
permitir visualizar/exportar;
bloquear criação conforme regra;
direcionar para site.
```

## Fluxo de upgrade

```text
Usuário tenta recurso bloqueado
→ Modal "Disponível no PRO/TOP"
→ Botão "Ver planos"
→ Abre site web
```

Mobile:

```text
linguagem neutra;
sem preço agressivo no app.
```

## Fluxo de erro/sem permissão

```text
Ação bloqueada
→ Mensagem clara
→ Explicar motivo
→ Mostrar próximo passo
```

Exemplo:

```text
"Você não tem permissão para ver o financeiro. Peça acesso ao administrador da empresa."
```


---

# 04 — Screen Specs Mobile

## Padrões gerais mobile

```text
Header simples;
CTA principal visível;
Bottom tab;
Cards para listas;
Busca no topo das listas;
Filtros em bottom sheet;
Formulários em tela cheia;
Ações destrutivas com confirmação.
```

## Login

### Componentes

```text
Logo/nome do app
Input email
Input senha
Botão Entrar
Link Esqueci minha senha
Link Criar conta
Mensagem de erro
Loading no botão
```

### Estados

```text
invalid_credentials
email_not_verified
account_disabled
loading
```

## Cadastro

### Componentes

```text
Nome
Email
Telefone
Senha
Confirmar senha
Aceite termos
Botão Criar conta
```

### Validações

```text
email válido;
senha mínimo 10 caracteres;
confirmar senha igual;
aceite obrigatório.
```

## Selecionar/Criar Empresa

### Se já tem empresa

Card por empresa:

```text
nome fantasia;
documento mascarado;
status;
botão Entrar.
```

### Se não tem empresa

Tela `Criar empresa`.

Campos:

```text
Nome fantasia
CPF/CNPJ
Telefone
Cidade/UF
Cor da marca
Logo opcional
```

## Home

### Conteúdo

```text
saudação;
empresa atual;
cards:
  orçamentos pendentes;
  OS em execução;
  compromissos de hoje;
  recebimentos pendentes;
CTA:
  Novo orçamento
  Novo cliente
  Novo agendamento
Lista:
  próximos compromissos;
  atividades recentes.
```

### Empty state

```text
"Comece criando seu primeiro cliente ou orçamento."
```

## Clientes — Lista

### Componentes

```text
SearchInput
Filtro: Todos / Meus / Recentes
CustomerCard
FAB + Cliente
```

CustomerCard:

```text
nome;
telefone;
cidade;
último orçamento/OS;
badge se possui pendências.
```

## Cliente — Detalhe

### Abas

```text
Resumo
Orçamentos
OS
Agenda
Financeiro
Anexos
```

### Ações

```text
Novo orçamento
Nova OS
Agendar
Editar cliente
WhatsApp
Ligar
```

## Novo Cliente

Campos:

```text
Nome obrigatório
Tipo PF/PJ
CPF/CNPJ
Telefone
Email
Endereço
Observações
Atribuir técnico
```

Botões:

```text
Salvar
Salvar e criar orçamento
Cancelar
```

## Catálogo

### Lista

```text
Tabs: Serviços / Produtos / Mão de obra / Outros
Search
ItemCard
FAB + Item
```

ItemCard:

```text
nome;
descrição curta;
preço;
unidade;
ativo/inativo.
```

## Novo Item de Catálogo

Campos:

```text
Tipo
Nome
Descrição
Unidade
Preço unitário
Ativo
```

Validação:

```text
nome obrigatório;
preço string decimal;
tipo obrigatório.
```

## Orçamentos — Lista

### Componentes

```text
Search
Filtros: status, período
QuoteCard
FAB + Orçamento
```

QuoteCard:

```text
número;
cliente;
status badge;
valor total;
validade;
data;
indicador PDF.
```

## Novo Orçamento

Fluxo em etapas:

```text
1. Cliente
2. Itens
3. Desconto/validade
4. Observações/termos
5. Revisão
```

### Step Cliente

```text
selecionar cliente;
criar cliente rápido.
```

### Step Itens

```text
adicionar item do catálogo;
adicionar item avulso;
editar quantidade;
editar preço;
editar desconto;
remover item.
```

### Step Revisão

```text
subtotal;
desconto;
total;
validade;
termos;
botão salvar rascunho;
botão gerar PDF.
```

## Detalhe Orçamento

Conteúdo:

```text
status;
cliente;
itens;
valores;
validade;
histórico de versões;
PDF;
ações.
```

Ações por status:

```text
DRAFT:
editar, gerar PDF, enviar.

PENDING:
reenviar, aprovar manualmente, rejeitar.

APPROVED:
ver OS criada.

REJECTED:
duplicar.

EXPIRED:
duplicar/reativar.

CANCELLED:
duplicar.
```

## Preview PDF

```text
visualização;
download;
compartilhar WhatsApp;
copiar link;
regenerar.
```

## Ordens de Serviço — Lista

Filtros:

```text
Aberta
Agendada
Em execução
Finalizada
Cancelada
```

WorkOrderCard:

```text
número;
cliente;
status;
técnico;
data agendada;
origem: orçamento/manual.
```

## Detalhe OS

Abas:

```text
Resumo
Execução
Fotos
Assinatura
Financeiro
```

Ações:

```text
Iniciar
Adicionar foto
Adicionar material
Coletar assinatura
Finalizar
Gerar relatório
Registrar recebimento
```

## Coletar Assinatura

Tela horizontal quando possível.

Componentes:

```text
nome do assinante;
documento opcional;
canvas assinatura;
limpar;
salvar.
```

## Fotos OS

```text
botão câmera;
botão galeria;
tipo: antes/durante/depois;
legenda;
status upload;
retry.
```

## Agenda

Views mobile:

```text
Hoje
Semana
Lista
```

AppointmentCard:

```text
hora;
título;
cliente;
técnico;
vínculo OS/orçamento;
status.
```

CTA:

```text
+ Compromisso
```

## Novo Agendamento

Campos:

```text
Título
Cliente opcional
OS/orçamento opcional
Técnico
Data
Hora início
Hora fim
Lembrete
Local
Observações
```

## Financeiro

### MVP

```text
Resumo:
  recebido no mês;
  pendente;
  vencido.

Lista:
  recebimentos.

Filtros:
  período;
  status;
  cliente.
```

### Registrar recebimento

```text
cliente;
OS/orçamento opcional;
valor;
método;
vencimento;
pago em;
observações.
```

## Configurações

Itens:

```text
Empresa
Identidade visual
Pix
Usuários
Plano
Segurança
Ajuda
Sair
```

## Plano bloqueado

Tela/bottom sheet:

```text
Título:
Recurso disponível em outro plano.

Descrição:
Este recurso faz parte do plano PRO/TOP.

Ações:
Ver planos
Agora não
```

Mobile sem preço agressivo.

## Sem conexão

Banner:

```text
Sem conexão. Algumas ações serão salvas como rascunho.
```

## Sincronização pendente

Card:

```text
2 itens pendentes de sincronização
Tentar agora
```

## Empty states padrão

### Clientes

```text
Você ainda não cadastrou clientes.
Cadastre seu primeiro cliente para criar orçamentos e serviços.
```

### Orçamentos

```text
Nenhum orçamento ainda.
Crie um orçamento profissional com a identidade da sua empresa.
```

### Agenda

```text
Nada agendado para hoje.
Crie um compromisso para organizar sua rotina.
```


---

# 05 — Screen Specs Web

## Padrões gerais web

```text
Sidebar fixa;
Header com busca e empresa atual;
Tabelas com filtros;
Formulários em páginas ou drawers;
Dashboard com cards;
Ações principais no topo direito;
Responsivo para tablet;
desktop-first, mas não quebrar mobile.
```

## Login Web

Layout centralizado.

Componentes:

```text
card login;
email;
senha;
entrar;
esqueci senha;
criar conta.
```

## App Shell

### Sidebar

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

### Header

```text
Search global
Empresa atual
Notificações
Usuário
```

## Dashboard

Cards:

```text
Orçamentos pendentes
OS em execução
Compromissos hoje
Recebimentos pendentes
```

Seções:

```text
Próximos compromissos
Últimos orçamentos
Atividades recentes
```

TOP/PRO:

```text
Resumo financeiro;
gráficos se disponível.
```

## Clientes — Lista

Tabela:

```text
Nome
Telefone
Documento
Cidade
Responsável
Última atividade
Ações
```

Filtros:

```text
busca;
responsável;
cidade;
criado em.
```

Ações:

```text
Novo cliente
Importar futuro
Exportar futuro
```

## Cliente — Detalhe

Layout:

```text
coluna esquerda: dados do cliente;
coluna direita: histórico.
```

Tabs:

```text
Resumo
Orçamentos
OS
Agenda
Financeiro
Arquivos
```

## Catálogo

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
tipo;
ativo/inativo;
busca.
```

## Orçamentos

Tabela:

```text
Número
Cliente
Status
Valor
Validade
Criado em
Ações
```

Filtros:

```text
status;
período;
cliente;
valor.
```

Ações:

```text
Novo orçamento
Duplicar
Gerar PDF
Compartilhar
```

## Editor de Orçamento Web

Layout em duas colunas:

```text
esquerda: dados e itens;
direita: resumo financeiro fixo.
```

Seções:

```text
Cliente
Itens
Descontos
Validade
Termos
Observações
```

Ações:

```text
Salvar rascunho
Gerar PDF
Enviar
Cancelar
```

## Detalhe Orçamento Web

Header:

```text
número;
status;
cliente;
valor;
ações.
```

Conteúdo:

```text
itens;
versões;
PDF;
histórico;
OS vinculada.
```

## OS Web

Tabela:

```text
Número
Cliente
Técnico
Status
Agendada para
Finalizada em
Ações
```

Detalhe:

```text
Resumo
Execução
Fotos
Assinatura
Financeiro
Histórico
```

## Agenda Web

Visões:

```text
Mês
Semana
Dia
Lista
```

Filtros:

```text
técnico;
cliente;
status.
```

Interações:

```text
clique em dia/hora cria compromisso;
arrastar compromisso é futuro;
abrir detalhe em drawer.
```

## Financeiro Web

Cards:

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
```

Filtros:

```text
período;
status;
método;
cliente.
```

TOP:

```text
gráfico evolução mensal;
gráfico por método;
gráfico por categoria.
```

## Documentos Web

MVP:

```text
lista PDFs gerados;
baixar;
copiar link;
reenviar.
```

Fase 4:

```text
templates;
contratos;
textos padronizados.
```

## Configurações Web

Seções:

```text
Empresa
Identidade visual
Chave Pix
Usuários
Permissões
Plano
Segurança
Exportação de dados
```

## Billing Web

Tela:

```text
plano atual;
status;
próxima cobrança;
uso;
botão regularizar;
botão mudar plano;
histórico de pagamentos.
```

## Admin Master

Rota separada.

```text
/admin/companies
/admin/webhooks
/admin/jobs
/admin/audit
/admin/subscriptions
```

Visual simples. Segurança máxima.

## Estados padrão web

```text
Skeleton table;
Empty table;
Error panel;
No permission;
Plan blocked;
Offline/network error.
```

## Responsividade

```text
>= 1280: sidebar fixa e conteúdo amplo.
1024-1279: sidebar compacta.
768-1023: sidebar colapsável.
<768: web ainda funciona, mas recomendar app mobile.
```


---

# 06 — Components

## Componentes base

### Button

Variantes:

```text
primary
secondary
outline
ghost
danger
success
```

Tamanhos:

```text
sm
md
lg
icon
```

Estados:

```text
default
hover web
pressed mobile
loading
disabled
```

### Input

Tipos:

```text
text
email
password
phone
document
money
number
date
time
textarea
search
```

Regras:

```text
label sempre visível;
erro abaixo;
helper text opcional;
máscara para CPF/CNPJ/telefone;
money usa string decimal.
```

### Select

```text
single;
searchable em web;
bottom sheet em mobile se lista grande.
```

### Card

Usos:

```text
CustomerCard
QuoteCard
WorkOrderCard
AppointmentCard
MetricCard
PlanCard
```

### StatusBadge

Recebe:

```text
status;
label;
color semantic.
```

### EmptyState

Props:

```text
icon
title
description
actionLabel
onAction
```

### ErrorState

```text
mensagem amigável;
botão tentar novamente;
código técnico opcional escondido.
```

### LoadingSkeleton

```text
card skeleton;
table skeleton;
form skeleton.
```

## Componentes de domínio

### CustomerCard

Campos:

```text
name
phone
city
lastActivity
assignedTo
```

Ações:

```text
abrir;
WhatsApp;
ligar.
```

### QuoteCard

Campos:

```text
number
customerName
status
total
validUntil
createdAt
```

### WorkOrderCard

Campos:

```text
number
customerName
status
assignedTo
scheduledAt
```

### AppointmentCard

Campos:

```text
title
time
customerName
assignedTo
status
```

### MoneyDisplay

```text
valor string decimal;
formato pt-BR;
R$ 1.234,56.
```

### MoneyInput

Regras:

```text
internamente string;
nunca number;
máscara pt-BR;
envia decimal string para API.
```

### DocumentPreview

```text
preview;
baixar;
compartilhar;
copiar link.
```

### SignaturePad

Mobile:

```text
canvas;
limpar;
salvar;
girar tela se necessário.
```

Web:

```text
canvas responsivo.
```

### FileUploader

```text
selecionar arquivo;
câmera mobile;
galeria;
progress;
retry;
erro;
limite de plano.
```

### PlanGate

Props:

```text
requiredPlan
featureName
currentPlan
```

Render:

```text
bloqueia recurso;
explica;
CTA ver planos.
```

### PermissionGate

```text
mostra/oculta ações;
nunca substitui validação backend.
```

## Componentes web

### AppSidebar

Itens:

```text
Dashboard
Clientes
Catálogo
Orçamentos
OS
Agenda
Financeiro
Documentos
Configurações
```

### DataTable

Recursos:

```text
sort;
filter;
pagination;
empty state;
row actions.
```

### PageHeader

```text
title
description
primaryAction
secondaryActions
```

### DrawerForm

Uso:

```text
criar/editar item sem sair da lista.
```

## Componentes mobile

### BottomTabs

```text
Home
Clientes
Orçamentos
Agenda
Mais
```

### FloatingActionButton

Contextual.

```text
+ Cliente
+ Orçamento
+ Compromisso
```

### BottomSheet

Uso:

```text
filtros;
seleção;
ações rápidas.
```

### OfflineBanner

```text
Sem conexão. Algumas ações serão salvas como rascunho.
```

### SyncPendingCard

```text
2 itens pendentes de sincronização
Tentar agora
```

## Component naming

Usar inglês nos nomes de componentes e arquivos.

```text
CustomerCard.tsx
QuoteStatusBadge.tsx
MoneyInput.tsx
AppointmentForm.tsx
```

Texto exibido ao usuário em pt-BR.


---

# 07 — Copywriting pt-BR

## Tom de voz

```text
direto;
profissional;
simples;
sem gíria exagerada;
sem hype;
sem emoji;
sem parecer robô;
focado em ajudar o técnico.
```

## Termos padrão

Usar:

```text
Cliente
Orçamento
Ordem de Serviço
Serviço
Agenda
Recebimento
Recibo
Documento
Catálogo
Produto
Técnico
Empresa
Plano
```

Evitar:

```text
lead;
pipeline;
deal;
kanban;
tenant;
workspace;
invoice em inglês.
```

## Mensagens de empty state

### Clientes

```text
Você ainda não cadastrou clientes.
Cadastre seu primeiro cliente para criar orçamentos e serviços.
```

### Orçamentos

```text
Nenhum orçamento por aqui.
Crie um orçamento profissional com a identidade da sua empresa.
```

### OS

```text
Nenhuma ordem de serviço encontrada.
Quando um orçamento for aprovado, a OS será criada automaticamente.
```

### Agenda

```text
Nada agendado para este período.
Crie um compromisso para organizar sua rotina.
```

### Financeiro

```text
Nenhum recebimento registrado.
Registre os valores recebidos para acompanhar seu financeiro.
```

## Mensagens de erro

### Genérico

```text
Não foi possível concluir a ação.
Tente novamente em instantes.
```

### Sem permissão

```text
Você não tem permissão para acessar este recurso.
Peça acesso ao administrador da empresa.
```

### Plano

```text
Este recurso faz parte de outro plano.
Você pode continuar usando os recursos disponíveis no seu plano atual.
```

### Assinatura pendente

```text
Sua assinatura está pendente.
Você ainda pode visualizar seus dados, mas novas ações estão temporariamente bloqueadas.
```

### Sem conexão

```text
Sem conexão.
Algumas ações serão salvas como rascunho e enviadas quando a internet voltar.
```

### Lock

```text
Este item está sendo editado por outra pessoa.
Tente novamente em alguns minutos.
```

## CTAs

```text
Novo cliente
Novo orçamento
Nova OS
Novo compromisso
Gerar PDF
Compartilhar no WhatsApp
Registrar recebimento
Salvar rascunho
Salvar e continuar
Aprovar orçamento
Rejeitar orçamento
Finalizar OS
Ver planos
Regularizar assinatura
Exportar dados
```

## Onboarding

### Tela 1

```text
Organize seus clientes e serviços
Tenha tudo em um só lugar, no celular e no computador.
```

### Tela 2

```text
Crie orçamentos profissionais
Gere PDFs com a identidade visual da sua empresa e compartilhe pelo WhatsApp.
```

### Tela 3

```text
Transforme orçamento em serviço
Quando o cliente aprovar, a ordem de serviço é criada automaticamente.
```

## Planos

### Grátis

```text
Para testar e começar sem compromisso.
```

### POP

```text
Para quem quer economizar e profissionalizar os orçamentos.
```

### PRO

```text
Para quem já tem volume e quer ganhar tempo.
```

### TOP

```text
Completo para equipes e negócios mais avançados.
```

## Textos de upgrade

```text
Você chegou ao limite do uso justo deste plano.
Para continuar criando novos registros, considere mudar para um plano superior.
```

```text
Este recurso está disponível no plano PRO.
Com ele, você ganha mais controle e economiza tempo no atendimento.
```

## Linguagem App Store

Não usar:

```text
Pague fora do app.
Evite taxa da Apple.
Assine mais barato no site.
```

Usar:

```text
Sua assinatura é gerenciada pelo painel da sua conta.
Acesse o painel para regularizar ou alterar seu plano.
```


---

# 08 — GSD Frontend Execution

## Objetivo

Quebrar o front em entregas controladas para Claude Design/Claude Code executar sem gerar telas demais.

## Goal Front 0 — Design foundation

### Deliverable F0.1 — Design tokens

Critério de pronto:

```text
tokens de cor, tipografia, radius, spacing e status definidos para mobile e web.
```

Tasks:

```text
[ ] criar tokens compartilhados;
[ ] mapear status badges;
[ ] criar tema light;
[ ] deixar dark mode para futuro;
[ ] documentar uso.
```

### Deliverable F0.2 — Componentes base

Critério:

```text
Button, Input, Card, Badge, EmptyState e ErrorState definidos.
```

Tasks:

```text
[ ] especificar props;
[ ] criar variações;
[ ] criar exemplos;
[ ] validar mobile e web.
```

## Goal Front 1 — App shell

### Deliverable F1.1 — Mobile shell

```text
[ ] AuthStack;
[ ] MainTabs;
[ ] Home placeholder;
[ ] Clientes placeholder;
[ ] Orçamentos placeholder;
[ ] Agenda placeholder;
[ ] Mais placeholder.
```

### Deliverable F1.2 — Web shell

```text
[ ] layout com sidebar;
[ ] header;
[ ] dashboard placeholder;
[ ] rota clientes placeholder;
[ ] rota orçamentos placeholder;
[ ] rota agenda placeholder.
```

## Goal Front 2 — Vertical slice Customer

### Deliverable F2.1 — Mobile customer

```text
[ ] lista clientes;
[ ] busca;
[ ] empty state;
[ ] novo cliente;
[ ] detalhe cliente;
[ ] loading/error.
```

### Deliverable F2.2 — Web customer

```text
[ ] tabela clientes;
[ ] filtros;
[ ] drawer/página novo cliente;
[ ] detalhe cliente;
[ ] loading/error/empty.
```

Critério da fase:

```text
Criar cliente pelo mobile e ver na web.
Criar cliente pela web e ver no mobile.
```

## Goal Front 3 — Catálogo

```text
[ ] lista mobile;
[ ] tabela web;
[ ] criar item;
[ ] editar item;
[ ] usar item no orçamento depois.
```

## Goal Front 4 — Orçamentos

```text
[ ] lista mobile/web;
[ ] editor mobile em etapas;
[ ] editor web em duas colunas;
[ ] resumo financeiro;
[ ] status badges;
[ ] preview PDF;
[ ] compartilhar.
```

## Goal Front 5 — OS

```text
[ ] lista OS;
[ ] detalhe OS;
[ ] iniciar/finalizar;
[ ] fotos;
[ ] assinatura;
[ ] recebimento.
```

## Goal Front 6 — Agenda

```text
[ ] mobile lista/dia/semana;
[ ] web calendário;
[ ] novo compromisso;
[ ] lembretes;
[ ] vincular cliente/OS.
```

## Goal Front 7 — Financeiro básico

```text
[ ] resumo;
[ ] lista recebimentos;
[ ] filtros;
[ ] registrar recebimento.
```

## Regras GSD

```text
1. Cada deliverable deve funcionar em mobile e web quando aplicável.
2. Não implementar tela sem spec aprovada.
3. Não criar componente novo se componente existente resolve.
4. Não mexer em backend sem spec da API.
5. Não criar design fora do DESIGN_SYSTEM.md.
6. Não fazer contratos/estoque/fiscal antes do MVP principal.
```


---

# 09 — Prompt para Claude Design / Claude Code

Use este prompt como entrada inicial.

```text
Você é responsável por preparar e executar o front-end mobile e web do SaaS B2B para técnicos instaladores.

Leia obrigatoriamente:
- /docs/PLANEJAMENTO_FINAL_V3.md
- /docs/01_DESIGN_SYSTEM.md
- /docs/02_FRONTEND_ARCHITECTURE.md
- /docs/03_UX_FLOWS.md
- /docs/04_SCREEN_SPECS_MOBILE.md
- /docs/05_SCREEN_SPECS_WEB.md
- /docs/06_COMPONENTS.md
- /docs/07_COPYWRITING_PTBR.md
- /docs/08_GSD_FRONTEND_EXECUTION.md

Stack:
- Mobile: React Native + Expo + TypeScript
- Web: Next.js + TypeScript + Tailwind + shadcn/ui
- Backend: NestJS API
- Shared: packages/shared-types com DTOs, Zod schemas e enums

Objetivo:
Deixar o front mobile e web pronto de acordo com a documentação, sem inventar identidade visual ou fluxo fora da spec.

Antes de implementar código:
1. Faça uma leitura crítica da documentação.
2. Liste dúvidas, conflitos e riscos.
3. Proponha um plano por fases usando GSD.
4. Não implemente nada até eu aprovar o plano.

Regras:
- Não criar telas fora da Fase 1 e Fase 2 sem autorização.
- Não implementar estoque, fiscal, contratos avançados ou gráficos antes do MVP.
- Mobile e web devem compartilhar linguagem visual.
- Mobile prioriza uso em campo.
- Web prioriza gestão em PC.
- Todo formulário deve ter loading, error e empty state quando aplicável.
- Valores monetários nunca usam number; usar string decimal/Decimal.js.
- Não importar Prisma no front.
- Não duplicar regra de negócio no front.
- Usar design system.
- Usar textos em pt-BR definidos em COPYWRITING.
- Preferir componentes simples e reutilizáveis.
- Não usar emoji na UI.
- Não usar animações exageradas.
- Não criar design parecido com ERP pesado.

Primeira entrega:
Crie apenas o App Shell mobile e web:
- mobile: AuthStack, MainTabs, placeholders de Home/Clientes/Orçamentos/Agenda/Mais;
- web: layout com sidebar, header, dashboard placeholder e rotas principais;
- componentes base: Button, Input, Card, StatusBadge, EmptyState, ErrorState, LoadingSkeleton;
- nenhum backend real ainda, apenas mocks tipados.

Depois aguarde aprovação.
```


---

# 10 — Frontend Acceptance Checklist

## Design system

```text
[ ] cores aplicadas corretamente;
[ ] tipografia consistente;
[ ] spacing consistente;
[ ] radius consistente;
[ ] status badges padronizados;
[ ] ícones Lucide;
[ ] sem UI genérica aleatória;
[ ] sem emoji;
[ ] textos em pt-BR.
```

## Mobile

```text
[ ] bottom tabs corretas;
[ ] telas respeitam safe area;
[ ] touch targets >= 44px;
[ ] formulários usáveis em celular;
[ ] loading/error/empty states;
[ ] offline banner previsto;
[ ] sync pending previsto;
[ ] navegação simples;
[ ] CTA principal óbvio.
```

## Web

```text
[ ] sidebar correta;
[ ] header com busca/empresa/usuário;
[ ] tabelas com filtros;
[ ] formulários com validação;
[ ] responsivo para tablet;
[ ] loading/error/empty states;
[ ] não parece ERP pesado;
[ ] mesma identidade do mobile.
```

## Produto

```text
[ ] fluxo Cliente funciona;
[ ] fluxo Catálogo especificado;
[ ] fluxo Orçamento especificado;
[ ] fluxo OS especificado;
[ ] fluxo Agenda especificado;
[ ] fluxo Financeiro básico especificado;
[ ] plano bloqueado especificado;
[ ] assinatura pendente especificada.
```

## Técnico

```text
[ ] TypeScript sem erro;
[ ] front não importa Prisma;
[ ] money não usa number em payload;
[ ] API client trata 401/402/403/423;
[ ] componentes reutilizáveis;
[ ] shared-types usado corretamente;
[ ] sem regra de negócio crítica no front.
```

## Pronto para implementação

```text
[ ] Claude listou dúvidas antes de codar;
[ ] Claude gerou plano GSD;
[ ] você aprovou plano;
[ ] primeira entrega é App Shell, não app inteiro;
[ ] vertical slice Customer vem depois do shell.
```


---

# Frontend Design Package — SaaS B2B para Técnicos Instaladores

Este pacote deve ser enviado ao Claude Design/Claude Code junto com `PLANEJAMENTO_FINAL_V3.md`.

Objetivo: deixar o front mobile e web especificado o suficiente para a IA gerar telas consistentes, sem inventar padrão visual, fluxo ou componente do zero.

## Arquivos

```text
01_DESIGN_SYSTEM.md
02_FRONTEND_ARCHITECTURE.md
03_UX_FLOWS.md
04_SCREEN_SPECS_MOBILE.md
05_SCREEN_SPECS_WEB.md
06_COMPONENTS.md
07_COPYWRITING_PTBR.md
08_GSD_FRONTEND_EXECUTION.md
09_CLAUDE_DESIGN_PROMPT.md
10_ACCEPTANCE_CHECKLIST.md
```

## Stack de front

```text
Mobile:
React Native + Expo + TypeScript

Web:
Next.js + TypeScript + Tailwind + shadcn/ui

Compartilhado:
packages/shared-types
Zod schemas
Enums
DTOs limpos, sem Prisma
```

## Regra principal

Não pedir para a IA “fazer o app inteiro”.

Executar por fases:

```text
1. Criar design system.
2. Criar shell/navegação mobile e web.
3. Criar telas da Fase 1: Auth + Empresa + Customer vertical slice.
4. Criar telas da Fase 2: Catálogo, Orçamentos, OS, Agenda e Financeiro básico.
5. Só depois evoluir para monetização, contratos, estoque e fiscal.
```
