# Teste manual — passo a passo

Guia para validar o Orcivo na prática. Siga **na ordem** — os primeiros testes
criam os dados que os seguintes usam. Tempo estimado: ~20 min.

Como ler cada teste:
- **Passos** = o que clicar/digitar.
- **Validar** = o que tem que acontecer (se não acontecer, é bug — anote).

---

## 0. Preparação (uma vez)

1. **Backend** rodando na porta 3000. No terminal:
   `pnpm --filter backend dev` → espere aparecer que subiu. (Se der erro de porta
   ocupada, já está rodando — siga em frente.)
2. **Web** rodando na porta 3001. Em **outro** terminal:
   `pnpm --filter web dev`
3. Abra o navegador em **http://localhost:3001**

**Validar:** a página **não** mostra mais "Backend OK / Fase 0 — Hello World".
Ela deve te levar para a tela de **login** (fundo branco à direita, painel roxo à esquerda).

> Dica: faça os testes com uma **conta nova** (Teste 1). Conta nova começa vazia,
> o que é perfeito para ver os "estados vazios" e depois preencher com dados reais.

---

## 1. Cadastro (Signup) e login

**Passos**
1. Na tela de login, clique em **"Criar conta"** (ou vá em http://localhost:3001/signup).
2. Etapa 1 — preencha: Nome (ex: `Seu Nome`), E-mail (ex: `teste1@orcivo.test`),
   Celular (opcional), Senha (mín. 8 caracteres, ex: `senha12345`).
3. Marque o checkbox dos **Termos**. Clique em **"Criar minha conta grátis"**.
4. Etapa 2 — preencha **Nome da empresa** (ex: `Minha Empresa`), Cidade, UF.
   Clique em **"Concluir cadastro"**.

**Validar**
- [ ] O painel **esquerdo (roxo)** ocupa uma faixa boa da tela (mais largo em monitor grande) — gradiente roxo→preto, com depoimento embaixo.
- [ ] Sem marcar os Termos, o botão acusa erro pedindo para aceitar.
- [ ] Os links **"Termos de uso"** e **"Política de privacidade"** abrem páginas (não são texto morto).
- [ ] Ao concluir, você **entra logado** e cai na tela de **Clientes** (vazia).
- [ ] Faça logout e login de novo com o mesmo e-mail/senha → entra normalmente.
- [ ] Login com senha errada → mensagem **"Credenciais inválidas"**.

---

## 2. Clientes (base para tudo)

**Passos**
1. Menu lateral → **Clientes** → botão **"Novo cliente"**.
2. Preencha Nome (ex: `Construtora Vila Nova`), Telefone (ex: `11999990000`),
   e o que quiser. Salve.
3. Crie um **segundo** cliente (ex: `Ana Souza`) — vamos usar os dois.

**Validar**
- [ ] O cliente salvo **aparece na lista** imediatamente.
- [ ] Clique no cliente → abre o **detalhe** com os dados certos.
- [ ] Botão **Editar** altera e salva (recarregue para confirmar que persistiu).

---

## 3. Catálogo (itens para o orçamento)

**Passos**
1. Menu → **Catálogo** → **"Novo item"**.
2. Crie um item (ex: `Instalação câmera CFTV 4MP`, preço `320,00`, unidade `un`). Salve.

**Validar**
- [ ] O item aparece na lista do catálogo com o preço formatado **R$ 320,00**.

---

## 4. Orçamento — fluxo crítico (criar → PDF → enviar → aprovar)

Este é o coração do produto. Teste com calma.

### 4a. Criar e bloqueios
**Passos**
1. Menu → **Orçamentos** → **"Novo orçamento"**.
2. **Não selecione cliente ainda.** Olhe os botões "Salvar rascunho", "Gerar PDF"
   e (na lateral) "Compartilhar no WhatsApp" / "Baixar PDF".

**Validar (bloqueio)**
- [ ] Com **nenhum cliente** selecionado, esses botões estão **desabilitados/acinzentados**
      (não dá para gerar nada sem cliente).
- [ ] Aparece o aviso "Selecione um cliente e adicione ao menos um item...".

**Passos (continuação)**
3. Etapa **Cliente**: selecione `Construtora Vila Nova`. Título (opcional): `Instalação CFTV`.
4. Etapa **Itens**: clique **"Do catálogo"** e adicione o item criado; ajuste a quantidade
   (ex: `4`). Adicione também um item manual (ex: `Visita técnica`, qtd `1`, preço `180,00`).
5. Etapa **Desconto**: ponha `10` e tipo **Percentual**. Etapa **Termos**: deixe o padrão.
6. Veja a lateral direita: **Total** deve recalcular sozinho.

**Validar (cálculo)**
- [ ] O **Total** bate: (4×320 + 1×180) = R$ 1.460,00 − 10% = **R$ 1.314,00**.
- [ ] Os botões agora estão **habilitados** (cliente + itens preenchidos).

### 4b. Gerar PDF
**Passos**
7. Clique **"Gerar PDF"** (ou "Baixar PDF").

**Validar (PDF — design)**
- [ ] Abre uma aba com o **PDF**. Ele tem: tijolo roxo com a inicial da empresa,
      "ORÇAMENTO #1", tabela de itens, **Total em roxo**, área de assinaturas, rodapé "Orcivo".
- [ ] **Acentos corretos**: "Instalação", "câmera", "Visita técnica" (sem caracteres quebrados).
- [ ] Dinheiro no formato **R$ 1.314,00** (vírgula decimal, alinhado).
- [ ] Você foi levado para a **tela de detalhe** do orçamento (rascunho salvo).

### 4c. Enviar e aprovar
**Passos**
8. No detalhe, clique **"Enviar orçamento"**.
9. Copie o **link de aprovação** que aparece. Se o cliente tiver telefone, teste
   **"Compartilhar no WhatsApp"** (deve abrir o `wa.me` com o link na mensagem).
10. Abra o link de aprovação em uma **aba anônima** (simula o cliente).
11. Como cliente, aprove (botão / digitar nome / assinar — conforme habilitado).

**Validar**
- [ ] Enviar muda o status para **Enviado** e gera o link.
- [ ] WhatsApp abre com mensagem contendo o link.
- [ ] Na aba anônima, a página pública do orçamento abre e a **aprovação funciona**.
- [ ] Voltando ao app e recarregando, o orçamento fica **Aprovado** e foi criada uma **OS** automaticamente (veja em Ordens de Serviço).
- [ ] Baixando o PDF de novo, ele agora mostra a **assinatura/aprovação**.

---

## 5. Ordens de Serviço (OS)

**Passos**
1. Menu → **Ordens de Serviço**. Você deve ver a OS criada pela aprovação acima.
2. Abra a OS. Anexe **fotos** nos estágios **Antes / Durante / Depois**.
3. Mude o **status** (ex: para Em execução / Concluída).

**Validar**
- [ ] A OS aparece com cliente e número corretos.
- [ ] Upload de foto funciona e a foto aparece no estágio certo.
- [ ] Mudança de status persiste ao recarregar.

---

## 6. Financeiro (recebimentos reais) — NOVO

**Passos**
1. Menu → **Financeiro**. Em conta nova, deve estar **vazio**
   ("Nenhum recebimento ainda...") e o gráfico diz "Sem recebimentos no período".
2. Clique **"Registrar recebimento"**.
3. No modal: selecione um **cliente**, Descrição (ex: `OS #1 — entrada`),
   Valor `890,00`, Método `Pix`, Situação **Recebido**. Clique **Registrar**.
4. Registre um segundo com Situação **A receber** (valor `480,00`).

**Validar**
- [ ] Os dois lançamentos **aparecem na tabela** com cliente, valor (R$ 890,00 / R$ 480,00), método e status (Recebido / Pendente).
- [ ] Os **KPIs** no topo mudam: "Recebido no período" soma os recebidos; "Pendente" soma o a receber.
- [ ] O **gráfico** "Recebido por dia" passa a ter barra(s).
- [ ] No lançamento **Pendente**, aparece o botão **"Receber"**. Clique → status vira **Recebido** e os KPIs atualizam.
- [ ] O filtro de status (Todos / Recebido / Pendente...) filtra a tabela.
- [ ] **Não** há mais nomes fake (Marcos Pereira, Construtora Vila Nova com "OS #311" inventado).

---

## 7. Agenda (compromissos reais) — NOVO

**Passos**
1. Menu → **Agenda**. Em conta nova, a grade da semana está **vazia**.
2. Clique **"Novo compromisso"**.
3. No modal: Título (ex: `Visita técnica CFTV`), Tipo `Visita`, Cliente (opcional),
   **Data = hoje**, Início `09:00`, Fim `10:00`. Clique **Criar**.

**Validar**
- [ ] O compromisso **aparece na grade**, na **coluna do dia certo** e na **linha das 09:00**.
- [ ] O bloco mostra o título e o cliente/tipo, com uma barra colorida à esquerda.
- [ ] Clique em **"Hoje" / setas ‹ ›** para navegar semanas → ao voltar para a semana
      do compromisso, ele **reaparece** (a agenda recarrega por semana).

---

## 8. Dashboard (tela inicial real) — NOVO

> Faça este teste **depois** de criar orçamento, OS, recebimento e compromisso —
> assim o dashboard tem o que mostrar.

**Passos**
1. Menu → **Dashboard** (ou ícone início).

**Validar**
- [ ] No topo: **"Bom dia/Boa tarde, <seu nome>"** (seu nome real) + sua empresa + seu plano (ex: Orcivo Livre). **Não** mais "João / Ribeiro Elétrica".
- [ ] **KPIs reais**: "Agenda hoje" = 1 (o compromisso de hoje), "Recebimentos pendentes" = o valor a receber, "Orçamentos pendentes" reflete o que está Enviado.
- [ ] **"Agenda de hoje"** lista o compromisso que você criou (horário + título).
- [ ] Se não houver compromisso hoje → "Nenhum compromisso para hoje" (estado vazio honesto).
- [ ] **Ações rápidas** (Novo cliente, Novo orçamento, etc.) levam às telas certas.

---

## 9. Documentos — NOVO (dados reais)

**Passos**
1. Menu → **Documentos**. Aba **Orçamentos**.

**Validar**
- [ ] Lista os **orçamentos reais** que você criou (não documentos fake).
- [ ] Botão **Baixar PDF** abre o PDF; botão **Abrir** vai ao detalhe do orçamento.
- [ ] Aba **Ordens de Serviço** lista as OS reais.
- [ ] Abas **Recibos / Contratos** mostram estado vazio honesto ("em breve").

---

## 10. Plano e assinatura — NOVO (real + compliance)

**Passos**
1. Menu → **Plano**.

**Validar**
- [ ] O card roxo mostra seu **plano real** (conta nova = **Orcivo Livre**), status **Ativo**, e "Usuários na equipe = 1".
- [ ] **Pagamentos recentes**: como é plano Livre, mostra "O plano Livre não gera cobranças" (não os 4 pagamentos fake de R$ 89,90).
- [ ] Comparativo de planos com **preços corretos**: Livre R$ 0, Solo **R$ 9,90**, Mais **R$ 19,90**, Equipe **R$ 39,90**.
- [ ] **Nenhum texto "ilimitado"** em lugar nenhum (era proibido). Em vez disso: "OS conforme uso", "Equipe ampliada".
- [ ] O card do **seu** plano está destacado com borda roxa e botão "Plano atual" desabilitado.

---

## 11. Equipe — NOVO (membros + permissões honestas)

**Passos**
1. Menu → **Equipe**.

**Validar**
- [ ] **Membros ativos** lista você (antes ficava sempre vazio — era bug).
- [ ] **"Convidar membro"** → modal → enviar convite por e-mail → aparece em "Convites pendentes"; o lixeirinha revoga.
- [ ] **Permissões por função**: agora são ícones **✓ (permitido) / — (não permitido)**,
      somente leitura, com aviso "Padrão da função... personalizadas chegam em breve"
      (não são mais botões falsos que pareciam editáveis).

---

## 12. Configurações (conferir o que salva)

**Passos**
1. Menu → **Configurações**. Percorra as abas.
2. Em **Empresa / Pix / Aprovação**, altere algo e salve; recarregue.

**Validar**
- [ ] As abas Empresa, Pix e Aprovação **salvam** (persistem após recarregar).
- [ ] (Se alguma aba como "Visual/Notificações" não salvar, anote — pode ser stub.)

---

## O que NÃO precisa testar (ainda não implementado)
- **Trocar de plano / cobrança** (botões "Mudar para X"): depende da integração de
  pagamento (Asaas) — fora deste ciclo.
- **Recibos / Contratos** em Documentos: estado vazio proposital.

---

## Como reportar um problema
Para cada item que falhar, anote: **tela**, **o que fez**, **o que esperava**,
**o que aconteceu** (e print, se possível). Isso agiliza a correção.
