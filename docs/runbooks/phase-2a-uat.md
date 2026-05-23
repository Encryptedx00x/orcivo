# Guia de Testes Manuais — Fase 2A

## Pré-requisitos

| Ferramenta | Verificar |
|---|---|
| Docker Desktop rodando | `docker ps` |
| Node.js 20 + pnpm 9 | `node -v` / `pnpm -v` |
| Expo Go instalado no celular | Play Store / App Store |
| Celular e PC na **mesma rede Wi-Fi** | — |

---

## IMPORTANTE — IP local antes de subir qualquer serviço

O celular não consegue acessar `localhost` do seu PC. Antes de rodar qualquer app, descubra o IP local da sua máquina:

**Windows:**
```
ipconfig
```
Procure o campo **"Endereço IPv4"** na seção da rede Wi-Fi. Exemplo: `192.168.1.100`.

Esse IP vai aparecer em 3 lugares:
- `apps/mobile/.env` → `EXPO_PUBLIC_API_URL`
- URL de aprovação gerada pelo WhatsApp
- URL do `/approve/:token` que você vai abrir no celular

---

## 1. Configurar variáveis de ambiente

### Backend (`apps/backend/.env`)

```bash
cp apps/backend/.env.example apps/backend/.env
```

O `.env.example` já está correto para desenvolvimento local. Não é necessário editar.

Variáveis relevantes já configuradas:
```
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
APP_WEB_URL=http://localhost:3001
MAIL_PROVIDER=console   # e-mails aparecem no log do backend, não são enviados
```

### Mobile (`apps/mobile/.env`)

```bash
cp apps/mobile/.env.example apps/mobile/.env
```

Edite `apps/mobile/.env` e troque pelo seu IP local:

```
EXPO_PUBLIC_API_URL=http://192.168.X.X:3000
```

> Substitua `192.168.X.X` pelo IP encontrado no `ipconfig`.

### Web (`apps/web/.env.local`)

```bash
cp apps/web/.env.local.example apps/web/.env.local
```

Sem edição necessária — web acessa `http://localhost:3000` internamente via server-side.

---

## 2. Subir infraestrutura e serviços

Você vai precisar de **4 terminais** abertos na raiz do projeto.

### Terminal 1 — Infraestrutura (Postgres + Redis + MinIO)

```bash
pnpm dev:infra
```

Aguarde todos ficarem `healthy`. Deve aparecer:
- `orcivo_postgres_dev`
- `orcivo_redis_dev`
- `orcivo_minio_dev`

> **Se `pnpm dev:infra` falhar com "port 9000 already allocated":** você já tem um container MinIO rodando de antes. Rode `docker ps | grep minio` para confirmar. Se aparecer um container com as portas 9000-9001 mapeadas, está tudo certo — o backend vai conectar nele. Siga para o Terminal 2.

> **Console MinIO (opcional):** http://localhost:9001 — usuário `minioadmin` / senha `minioadmin`
> Os buckets `orcivo-pdfs` e `orcivo-photos` são criados automaticamente quando o backend iniciar.

### Terminal 2 — Backend

```bash
pnpm dev:backend
```

Aguardar: `Nest application successfully started`

Verificar:
```bash
curl http://localhost:3000/health
# → {"status":"ok"}
```

### Terminal 3 — Web

```bash
pnpm dev:web
```

URL: **http://localhost:3001**

### Terminal 4 — Mobile

```bash
pnpm dev:mobile
```

Quando o QR Code aparecer, escaneie com:
- **Android:** câmera nativa ou o próprio Expo Go
- **iPhone:** câmera nativa

---

## 3. Criar conta de teste

Você precisa de uma conta para testar. Todo cadastro novo é **plano Orcivo Livre** automaticamente.

### Opção A — Cadastro pelo Web (recomendado para testar signup web)

1. Abra http://localhost:3001
2. Clique em **"Criar conta"**
3. Preencha passo 1: nome, e-mail, telefone (opcional), senha (mín. 8 caracteres)
4. Preencha passo 2: nome da empresa, cidade, estado (opcionais)
5. Após confirmar → você entra direto no dashboard

### Opção B — Cadastro pelo Mobile (para testar signup mobile)

1. Abra o app no Expo Go
2. Toque em **"Criar conta"**
3. Preencha os mesmos dados
4. Após confirmar → 5 tabs aparecem na parte inferior

> **Mesma conta funciona nos dois.** Você pode criar pelo web e fazer login no mobile (ou vice-versa) com as mesmas credenciais.

---

## Teste 1 — Fluxo completo end-to-end mobile

**Objetivo:** Técnico cria orçamento no mobile, compartilha via WhatsApp, cliente aprova via link, OS é criada automaticamente.

### Passo a passo

**1. Fazer login no mobile**
- Se ainda não tem conta, crie pelo web (Opção A acima) e faça login no mobile
- Ou crie direto pelo mobile (Opção B)

**2. Criar item no catálogo**
- Tab inferior → **"Mais"** → **"Catálogo"**
- Toque no **"+"** (canto superior direito)
- Preencha:
  - Nome: `Instalação de câmera`
  - Tipo: Serviço
  - Preço: `150,00`
- Salvar
- ✅ Item aparece na lista com "R$ 150,00"

**3. Criar um orçamento**
- Tab inferior → **"Orçamentos"**
- Toque no **"+"** para novo orçamento
- Campo cliente: `João Silva` (qualquer nome)
- Toque em **"Adicionar item"** → selecione "Instalação de câmera"
- Quantidade: `2`
- ✅ Total exibe "R$ 300,00"
- Toque **"Criar orçamento"**

**4. Enviar via WhatsApp**
- Na lista de orçamentos, toque no orçamento criado
- Toque **"Enviar orçamento"**
- ✅ Botão WhatsApp aparece com link de aprovação
- Toque no WhatsApp → abre mensagem pré-preenchida com URL `http://192.168.X.X:3001/approve/[token]`

**5. Aprovar como cliente**
- Copie a URL da mensagem do WhatsApp
- Abra essa URL no **navegador do celular** (não precisa de login)
- ✅ Página exibe o orçamento sem pedir login
- Escolha **"Aprovar com nome"** → digite um nome → toque "Aprovar"
- ✅ Tela de confirmação "Orçamento aprovado!"

**6. Verificar OS criada automaticamente**
- Volte ao app no Expo Go
- Tab **"Mais"** → **"Ordens de Serviço"**
- ✅ Existe uma OS nova com status "Pendente" vinculada ao orçamento aprovado

---

## Teste 2 — PDF com marca d'água (plano Orcivo Livre)

**Objetivo:** Confirmar visualmente que o PDF tem a marca d'água "Orcivo Livre".

**Pré-condição:** MinIO rodando (`docker ps` mostra `orcivo_minio_dev` healthy).

### Passo a passo

**1. Criar e enviar um orçamento pela web**
- Acesse http://localhost:3001
- Faça login
- Menu lateral → **"Orçamentos"** → **"Novo Orçamento"**
- Adicione itens, confirme
- Na página do orçamento → clique **"Enviar orçamento"**

**2. Acessar o PDF gerado**
- Após enviar, o sistema gera o PDF automaticamente e salva no MinIO
- Opção 1 — DevTools: abra o Network tab do browser antes de clicar "Enviar"; procure a requisição que retorna a URL do PDF
- Opção 2 — Console MinIO: acesse http://localhost:9001 (minioadmin / minioadmin) → bucket `orcivo-pdfs` → baixe o arquivo `.pdf` gerado

**3. Verificar marca d'água**
- Abra o PDF baixado
- ✅ Texto **"Orcivo Livre"** aparece como marca d'água (diagonal ou rodapé)

---

## Teste 3 — Canvas de assinatura no mobile

**Objetivo:** Canvas captura o toque do dedo no celular.

### Passo a passo

**1. Gerar um link de aprovação**
- Execute o Teste 1 até o passo 4 (enviar via WhatsApp)
- Copie a URL: `http://192.168.X.X:3001/approve/[token]`

**2. Abrir no navegador do celular**
- Android: Chrome | iPhone: Safari
- Cole a URL no navegador
- ✅ Página carrega sem pedir login, mostra detalhes do orçamento

**3. Usar o canvas de assinatura**
- Toque na aba **"Assinar"** (terceiro método)
- ✅ Quadrado branco aparece com texto "Assine aqui"
- Desenhe com o dedo dentro do quadrado
- ✅ Traço aparece conforme move o dedo (sem delay visível)
- ✅ Botão **"Aprovar e assinar"** fica habilitado após desenhar
- Toque "Aprovar e assinar"
- ✅ Tela de confirmação aparece

---

## Checklist final

| # | Teste | Status |
|---|---|---|
| 1a | Aba "Orçamentos" mobile abre a lista (não "Em breve") | ⬜ |
| 1b | Orçamento criado com total Decimal correto (R$ 300,00) | ⬜ |
| 1c | Link WhatsApp gerado com URL de aprovação | ⬜ |
| 1d | Página de aprovação abre sem login | ⬜ |
| 1e | OS criada automaticamente após aprovação | ⬜ |
| 2 | PDF tem marca d'água "Orcivo Livre" | ⬜ |
| 3a | Canvas captura toque do dedo no mobile | ⬜ |
| 3b | Botão habilita após assinar, aprovação confirmada | ⬜ |

---

## Solução de problemas comuns

| Problema | Causa provável | Solução |
|---|---|---|
| `curl localhost:3000/health` retorna 401 | `@Public()` ausente | Já corrigido na Fase 1 |
| Mobile não conecta ao backend | IP errado no `.env` | Edite `apps/mobile/.env` com o IP correto do `ipconfig` |
| PDF não gera | MinIO não está rodando | `docker ps` → verifique `orcivo_minio_dev` healthy |
| Buckets não existem no MinIO | Backend não inicializou | Reinicie o backend; `StorageService.onModuleInit` cria os buckets |
| Link de aprovação abre `localhost` | `APP_WEB_URL` errado | `apps/backend/.env` → `APP_WEB_URL=http://192.168.X.X:3001` para testar no celular |
| E-mail de "senha esquecida" não chega | `MAIL_PROVIDER=console` | O e-mail aparece no **log do terminal do backend**, não é enviado de verdade |
