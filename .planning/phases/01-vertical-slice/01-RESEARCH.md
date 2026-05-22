# Phase 1: Vertical Slice — Research

**Researched:** 2026-05-22
**Domain:** NestJS Auth + Multi-tenant + React Native Navigation + Next.js App Router
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01 a D-05:** Signup em 2 etapas: tela 1 (usuário: nome, e-mail, telefone, senha, aceitar termos) → tela 2 (empresa: nome_fantasia, tipo_documento, documento, telefone, cidade, uf, cor_da_marca, logo, chave_pix). Plano inicial: `Orcivo Livre`. Sem trial.
- **D-06 a D-09:** Bottom tabs mobile com 5 itens (Início, Clientes, Orçamentos, Agenda, Mais). "Mais" contém stack secundária. Shell completo agora; telas de Auth e Customer funcionais; demais = placeholder.
- **D-10 a D-13:** Sidebar web com 9 itens. Shell completo (sidebar + topbar); Auth e Clientes funcionais; demais = placeholder.
- **D-14 a D-16:** Customer: nome, tipo, cpf_cnpj, telefone, email, cidade, uf, observacoes, assigned_to_user_id. Sem anexos, múltiplos contatos, múltiplos endereços. Deve provar isolamento multi-tenant em CI.
- **D-17 a D-20:** Auth Fase 1: signup, login, JWT access+refresh, CompanyMember validation, TenantGuard, logout. Sem 2FA. Autorização revalida a cada request com cache Redis 60s.
- **D-21 a D-22:** Documentação do molde arquitetural é deliverable explícito e obrigatório.

### Claude's Discretion

- Estrutura interna dos módulos NestJS (Auth, Company, Customer)
- Estratégia de refresh token (httpOnly cookie vs SecureStore)
- Formato exato do JWT payload
- Implementação do TenantGuard (decorator ou guard global)
- Estratégia de testes de isolamento multi-tenant no CI
- Se usar Zod ou class-validator para validação no backend
- Decisão sobre reset de senha: incluir ou diferir para Fase 2

### Deferred Ideas (OUT OF SCOPE)

- 2FA/TOTP
- Verificação de e-mail no signup
- Multi-device / sessão única
- Social login (Google/Apple)
- Notificações push
- Onboarding wizard após signup
- Reset de senha (a critério do planner — recomendação: diferir para Fase 2)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Descrição | Research Support |
|----|-----------|-----------------|
| AUTH-01 | Signup 2 etapas: usuário → empresa | Seções Auth Module + Prisma Schema |
| AUTH-02 | Login com JWT access token + refresh token | Seção Auth Module — JwtStrategy + RefreshStrategy |
| AUTH-03 | TenantGuard: validar membership e injetar company_id | Seção Multi-tenant — TenantGuard pattern |
| AUTH-04 | Logout (invalidar refresh token) | Seção Auth Module — refresh token no banco |
| TENANT-01 | Company, CompanyMember com company_id em Customer | Seção Prisma Schema |
| TENANT-02 | Teste de isolamento: empresa A não acessa dados da empresa B | Seção Multi-tenant Isolation Testing |
| CUSTOMER-01 | CRUD Customer no backend (create, list) com tenant scope | Seção Architecture Patterns |
| CUSTOMER-02 | Tela Customer no mobile (criar + listar) | Seção React Navigation |
| CUSTOMER-03 | Tela Clientes no web (criar + listar) | Seção Next.js Layout |
| NAV-01 | Shell de navegação mobile completo (5 tabs + stack "Mais") | Seção React Navigation |
| NAV-02 | Shell de navegação web completo (sidebar + topbar) | Seção Next.js Layout |
| TYPES-01 | shared-types: Zod schemas para signup, login, company create, customer CRUD | Seção shared-types DTOs |
| ARCH-01 | Documentação do molde arquitetural (D1.4) | Seção Architecture Patterns |
</phase_requirements>

---

## Summary

A Fase 1 prova a arquitetura multi-tenant de ponta a ponta. O backend NestJS recebe três módulos novos: `AuthModule` (signup/login/refresh/logout com argon2 + JWT), `CompanyModule` (criação de empresa no step 2 do signup) e `CustomerModule` (CRUD com tenant scope). Cada request autenticado passa pelo `JwtAuthGuard` e depois pelo `TenantGuard`, que extrai o `company_id` do banco via Redis cache 60s e injeta no contexto. Nenhuma query de domínio é executada sem esse filtro.

No mobile, o `App.tsx` atual (simples health check) é substituído por uma estrutura de navegação com `NavigationContainer`, um `RootNavigator` que alterna entre `AuthStack` (não autenticado) e `AppTabs` (autenticado com 5 tabs + stack secundária para "Mais"). No web, o `(app)/layout.tsx` adiciona sidebar fixa de 260px e topbar de 64px dentro de um route group autenticado; `(auth)/layout.tsx` serve as telas de login/signup sem sidebar. A proteção de rota no Next.js usa `middleware.ts` que lê o access token de cookie httpOnly e redireciona `/login` se ausente.

O `packages/shared-types` sai do estado vazio atual e passa a exportar schemas Zod para todas as operações da Fase 1. Por ser agnóstico de framework (sem `@prisma/client`, `@nestjs/*`, `react`), é consumido identicamente por backend, mobile e web — garantindo que DTOs de request e response sejam sempre os mesmos em toda a stack.

**Recomendação principal:** Usar cookie httpOnly para o refresh token (web + mobile via Capacitor/fetch com credentials), SecureStore do Expo para o access token no mobile, e armazenar o hash do refresh token no banco (tabela `refresh_tokens`) para revogação explícita no logout.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Hashing de senha (argon2) | API / Backend | — | Nunca no cliente; argon2 é CPU-intensivo e requer secrets |
| Emissão de JWT (access + refresh) | API / Backend | — | Secrets de assinatura só no servidor |
| Validação de JWT por request | API / Backend | — | JwtStrategy verifica assinatura e expiry |
| Cache de membership (Redis 60s) | API / Backend | — | Evita round-trip ao banco a cada request |
| Roteamento autenticado (mobile) | Browser / Client | — | RootNavigator lê AuthContext local |
| Roteamento autenticado (web) | Frontend Server (SSR) | — | Next.js middleware lê cookie httpOnly no edge |
| Isolamento de tenant | API / Backend | — | TenantGuard injeta company_id; frontend não toma decisão de isolamento |
| Armazenamento de token no mobile | Browser / Client | — | expo-secure-store (keychain/keystore) |
| Armazenamento de token no web | Frontend Server (SSR) | — | Cookie httpOnly — inacessível ao JS |
| Criação de Customer | API / Backend | — | Sempre com company_id; frontend envia apenas campos de negócio |
| Listagem de Customer | API / Backend | — | Filtro por company_id obrigatório no WHERE |

---

## Standard Stack

### Core

| Library | Versão verificada | Propósito | Por que padrão |
|---------|------------------|-----------|----------------|
| `@nestjs/passport` | 11.0.5 | Integração NestJS + Passport strategies | Wrapper oficial; reduz boilerplate de strategy |
| `@nestjs/jwt` | 11.0.2 | JwtModule + JwtService (sign/verify) | Wrapper oficial do `jsonwebtoken` para NestJS |
| `passport-jwt` | 4.0.1 | Estratégia JWT para Passport | Padrão de facto; extrai Bearer token do header |
| `passport` | — (peer dep) | Core Passport | Requerido como peer dependency |
| `argon2` | 0.44.0 | Hash de senhas | Vencedor PHC 2015; mais seguro que bcrypt contra GPU |
| `prisma` | 7.8.0 (cli) + `@prisma/client` | ORM + migrations | Decisão travada; migrations determinísticas |
| `ioredis` | 5.10.1 | Client Redis (cache de membership) | Mais robusto que `redis` nativo; suporte a cluster |
| `@nestjs/config` | 4.0.4 | Variáveis de ambiente com validação | Integração nativa com ConfigService no NestJS |
| `zod` | 4.4.3 | Validação de schemas em shared-types | Agnóstico de framework; inferência TypeScript nativa |

[VERIFIED: npm registry — todas as versões confirmadas em 2026-05-22]

### Mobile

| Library | Versão verificada | Propósito |
|---------|------------------|-----------|
| `@react-navigation/native` | 7.2.4 | Core da navegação React Native |
| `@react-navigation/bottom-tabs` | 7.16.1 | Tab bar dos 5 itens principais |
| `@react-navigation/native-stack` | 7.15.1 | Stack para AuthStack e stack do "Mais" |
| `react-native-screens` | 4.25.2 | Native screen containers (perf) |
| `react-native-safe-area-context` | 5.8.0 | Insets para notch/home bar |
| `react-native-gesture-handler` | 2.31.2 | Requerido pelo react-navigation |
| `react-native-reanimated` | 4.3.1 | Animações do navigator |
| `expo-secure-store` | 56.0.4 | Armazenamento seguro do access token (keychain/keystore) |
| `lucide-react-native` | 1.16.0 | Ícones (Lucide only — regra do CLAUDE.md) |

[VERIFIED: npm registry]

### Web

| Library | Versão verificada | Propósito |
|---------|------------------|-----------|
| `next` | 14.2.x (já instalado) | App Router com middleware auth |
| `tailwindcss` | 3.4.x (já instalado) | Styling |
| `shadcn/ui` | CLI-based (não é npm package) | Componentes sidebar, form, button, etc. |
| `lucide-react` | 1.16.0 | Ícones (Lucide only — regra do CLAUDE.md) |

[VERIFIED: npm registry + package.json existente]

### Instalação

```bash
# Backend — novos packages
cd apps/backend
pnpm add @nestjs/passport @nestjs/jwt passport passport-jwt argon2 ioredis @nestjs/config
pnpm add -D @types/passport-jwt @types/passport

# Prisma (raiz do monorepo)
pnpm add -D prisma
pnpm add @prisma/client

# shared-types
cd packages/shared-types
pnpm add zod

# Mobile — novos packages
cd apps/mobile
pnpm add @react-navigation/native @react-navigation/bottom-tabs @react-navigation/native-stack
pnpm add react-native-screens react-native-safe-area-context react-native-gesture-handler react-native-reanimated
pnpm add expo-secure-store lucide-react-native

# Web — novos packages
cd apps/web
pnpm add lucide-react
# shadcn/ui: instalado via CLI (npx shadcn@latest init)
```

---

## Architecture Patterns

### System Architecture Diagram

```
[Mobile: Expo]                    [Web: Next.js 14]
  AuthStack                         (auth)/login
  └─ SignupStep1Screen               (auth)/signup
  └─ SignupStep2Screen              (app)/layout.tsx ─── Sidebar + Topbar
  AppTabs                           (app)/clientes/page.tsx
  └─ TabInicio (placeholder)        middleware.ts ─── lê cookie JWT
  └─ TabClientes ─────────┐
  └─ TabOrcamentos (ph.)  │
  └─ TabAgenda (ph.)      │     [packages/shared-types]
  └─ TabMais (stack)      │       SignupStep1Dto (Zod)
       └─ Mais screens    │       SignupStep2Dto (Zod)
                          │       LoginDto (Zod)
    Bearer header ─────────┘       CustomerCreateDto (Zod)
          │                        CustomerListDto (Zod)
          ▼                              ↑
[API: NestJS Backend]                   │
  POST /auth/signup/user              shared between all tiers
  POST /auth/signup/company
  POST /auth/login
  POST /auth/refresh
  POST /auth/logout
       │
  JwtAuthGuard (verifica Bearer token)
       │
  TenantGuard (carrega company_id via Redis 60s)
       │
  CustomerController
  CompanyController
       │
  [Services + Repositories]
       │
  [Prisma ORM] ─────── company_id em todo WHERE
       │
  [PostgreSQL 16]
       │
  [Redis 7] ── cache membership 60s
```

### Estrutura de módulos recomendada

```
apps/backend/src/
├── app.module.ts            ← importa Auth, Company, Customer, Prisma, Config, Redis
├── prisma/
│   ├── prisma.module.ts
│   └── prisma.service.ts    ← singleton PrismaClient
├── redis/
│   ├── redis.module.ts
│   └── redis.service.ts     ← singleton ioredis
├── auth/
│   ├── auth.module.ts
│   ├── auth.controller.ts   ← /auth/signup/user, /auth/signup/company, /auth/login, /auth/refresh, /auth/logout
│   ├── auth.service.ts
│   ├── strategies/
│   │   ├── jwt.strategy.ts            ← valida access token
│   │   └── refresh-token.strategy.ts  ← valida refresh token
│   ├── guards/
│   │   ├── jwt-auth.guard.ts          ← extends AuthGuard('jwt')
│   │   └── tenant.guard.ts            ← injeta company_id no request
│   └── decorators/
│       ├── public.decorator.ts        ← @Public() para rotas abertas
│       └── current-user.decorator.ts  ← @CurrentUser() param decorator
├── company/
│   ├── company.module.ts
│   ├── company.controller.ts
│   └── company.service.ts
└── customer/
    ├── customer.module.ts
    ├── customer.controller.ts  ← GET /customers, POST /customers
    └── customer.service.ts
```

```
packages/shared-types/src/
├── index.ts
├── auth/
│   ├── signup-step1.dto.ts
│   ├── signup-step2.dto.ts
│   └── login.dto.ts
├── company/
│   └── company-create.dto.ts
└── customer/
    ├── customer-create.dto.ts
    └── customer-list.dto.ts
```

```
apps/mobile/
├── App.tsx                   ← substituído: apenas NavigationContainer + RootNavigator
├── src/
│   ├── navigation/
│   │   ├── RootNavigator.tsx     ← lê AuthContext e escolhe AuthStack ou AppTabs
│   │   ├── AuthStack.tsx         ← LoginScreen, SignupStep1Screen, SignupStep2Screen
│   │   └── AppTabs.tsx           ← 5 tabs + MaisStack
│   ├── screens/
│   │   ├── auth/
│   │   │   ├── LoginScreen.tsx
│   │   │   ├── SignupStep1Screen.tsx
│   │   │   └── SignupStep2Screen.tsx
│   │   ├── clientes/
│   │   │   ├── ClientesScreen.tsx
│   │   │   └── ClienteDetalheScreen.tsx
│   │   └── placeholders/
│   │       └── EmBreveScreen.tsx
│   ├── contexts/
│   │   └── AuthContext.tsx       ← token, user, login(), logout()
│   └── services/
│       └── api.ts                ← fetch wrapper com Bearer + X-Client-Request-Id
```

```
apps/web/app/
├── layout.tsx                    ← root layout (html, body, Inter, lang=pt-BR)
├── middleware.ts                 ← lê cookie JWT → redireciona /login se ausente
├── (auth)/
│   ├── layout.tsx                ← layout sem sidebar (apenas logo + conteúdo)
│   ├── login/page.tsx
│   └── signup/page.tsx
└── (app)/
    ├── layout.tsx                ← layout com Sidebar + Topbar
    ├── page.tsx                  ← redireciona para /clientes (dashboard Fase 2)
    └── clientes/
        └── page.tsx
```

### Pattern 1: JWT com access token de curta duração + refresh token de longa duração

**Quando usar:** Toda a stack de auth.

O access token expira em 15 minutos e é enviado como `Authorization: Bearer` header. O refresh token expira em 30 dias e é armazenado como cookie httpOnly no web (e via expo-secure-store no mobile). O hash SHA-256 do refresh token é salvo na tabela `refresh_tokens` do banco para permitir revogação explícita no logout.

```typescript
// Source: verificado em Context7 /nestjs/jwt + /nestjs/docs.nestjs.com

// apps/backend/src/auth/strategies/jwt.strategy.ts
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private configService: ConfigService,
    private redisService: RedisService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_ACCESS_SECRET'),
    });
  }

  async validate(payload: JwtPayload) {
    // JWT só identifica — autorização revalida via Redis cache 60s
    const cacheKey = `membership:${payload.sub}`;
    let membership = await this.redisService.get(cacheKey);
    if (!membership) {
      // carregar do banco e cachear por 60s
    }
    if (!membership) throw new UnauthorizedException();
    return { userId: payload.sub, email: payload.email };
  }
}
```

**JWT payload recomendado:**
```typescript
interface JwtPayload {
  sub: string;      // user.id (UUID)
  email: string;    // para display, não para autorização
  iat?: number;
  exp?: number;
}
```

**Separação de segredos:** `JWT_ACCESS_SECRET` e `JWT_REFRESH_SECRET` são segredos distintos — refresh token NÃO pode ser aceito como access token.

### Pattern 2: TenantGuard — injeta company_id no request

**Quando usar:** Em todos os endpoints de domínio (Customer, Company, etc.).

```typescript
// apps/backend/src/auth/guards/tenant.guard.ts
import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.userId; // injetado pelo JwtAuthGuard
    if (!userId) throw new ForbiddenException();

    const cacheKey = `tenant:${userId}`;
    let companyId = await this.redis.get(cacheKey);

    if (!companyId) {
      const member = await this.prisma.companyMember.findFirst({
        where: { user_id: userId, active: true },
        select: { company_id: true },
      });
      if (!member) throw new ForbiddenException('Sem empresa associada');
      companyId = member.company_id;
      await this.redis.setex(cacheKey, 60, companyId);
    }

    request.companyId = companyId; // disponível em todos os handlers
    return true;
  }
}
```

**Ordem dos guards:** `JwtAuthGuard` → `TenantGuard`. Aplicar globalmente no `AppModule` com exceção para rotas `@Public()`.

### Pattern 3: Roteamento condicional mobile (auth vs app)

```typescript
// apps/mobile/src/navigation/RootNavigator.tsx
// Source: padrão verificado em Context7 /react-navigation/react-navigation.github.io

import { useAuth } from '../contexts/AuthContext';

export function RootNavigator() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <SplashScreen />;

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {isAuthenticated ? (
        <Stack.Screen name="AppTabs" component={AppTabs} />
      ) : (
        <Stack.Screen name="AuthStack" component={AuthStack} />
      )}
    </Stack.Navigator>
  );
}
```

### Pattern 4: Next.js middleware para proteção de rotas web

```typescript
// apps/web/middleware.ts
// Source: verificado em Context7 /vercel/next.js — authentication guide

import { NextRequest, NextResponse } from 'next/server';

const publicPaths = ['/login', '/signup'];

export function middleware(request: NextRequest) {
  const token = request.cookies.get('access_token')?.value;
  const isPublic = publicPaths.some(p => request.nextUrl.pathname.startsWith(p));

  if (!isPublic && !token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  if (isPublic && token) {
    return NextResponse.redirect(new URL('/clientes', request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
```

### Pattern 5: RequestIdempotency header no mobile

Toda mutation do mobile envia `X-Client-Request-Id` (UUID v4 gerado no cliente). O backend armazena no Redis por 24h e retorna a resposta cached se o mesmo ID chegar de novo — evita duplicação de dados em retry automático.

```typescript
// apps/mobile/src/services/api.ts
import * as Crypto from 'expo-crypto';

export async function post<T>(path: string, body: unknown): Promise<T> {
  const idempotencyKey = Crypto.randomUUID();
  const token = await SecureStore.getItemAsync('access_token');
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'X-Client-Request-Id': idempotencyKey,
    },
    body: JSON.stringify(body),
  });
  // ...
}
```

### Anti-Patterns a Evitar

- **Confiar no payload JWT para autorização:** O payload só identifica. Sempre revalidar permissões via Redis/banco. [VERIFIED: ADR-006]
- **Esquecer company_id no WHERE:** Toda query de domínio deve ter `where: { company_id: request.companyId }`. Sem exceção. [VERIFIED: ADR-011]
- **Usar `number` ou `float` para valores monetários:** Usar `Prisma.Decimal` no backend, string decimal na API, `Decimal.js` no frontend. [VERIFIED: ADR-010]
- **Aceitar refresh token como access token:** Segredos JWT distintos; validar com o strategy correto.
- **Guardar token em localStorage no web:** Cookie httpOnly previne XSS.
- **Importar `@prisma/client` em `shared-types`:** O package deve ser agnóstico de framework. [VERIFIED: CLAUDE.md]

---

## Prisma Schema — Fase 1

Schema completo para as 4 tabelas da Fase 1. O arquivo final fica em `prisma/schema.prisma`.

```prisma
// Source: padrão verificado em Context7 /websites/prisma_io + ADR-005 + ADR-011

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─── Usuário ──────────────────────────────────────────────────────────────────

model User {
  id            String    @id @default(uuid())
  email         String    @unique
  name          String
  phone         String?
  password_hash String
  accepted_terms_at DateTime

  created_at    DateTime  @default(now())
  updated_at    DateTime  @updatedAt

  company_members CompanyMember[]
  refresh_tokens  RefreshToken[]
  assigned_customers Customer[] @relation("AssignedTo")

  @@map("users")
}

// ─── Empresa (tenant) ─────────────────────────────────────────────────────────

model Company {
  id              String  @id @default(uuid())
  trade_name      String                           // nome_fantasia
  document_type   DocumentType?                   // CPF ou CNPJ
  document        String?
  phone           String?
  city            String?
  state           String?                          // UF — 2 chars
  brand_color     String?                          // hex color
  logo_url        String?
  pix_key         String?
  plan_code       PlanCode @default(LIVRE)

  created_at      DateTime @default(now())
  updated_at      DateTime @updatedAt

  members         CompanyMember[]
  customers       Customer[]

  @@map("companies")
}

enum DocumentType {
  CPF
  CNPJ
}

enum PlanCode {
  LIVRE
  SOLO
  MAIS
  EQUIPE
}

// ─── Membership (usuário ↔ empresa) ──────────────────────────────────────────

model CompanyMember {
  id         String      @id @default(uuid())
  company_id String
  user_id    String
  role       MemberRole  @default(TECNICO)
  active     Boolean     @default(true)

  created_at DateTime    @default(now())
  updated_at DateTime    @updatedAt

  company    Company     @relation(fields: [company_id], references: [id], onDelete: Cascade)
  user       User        @relation(fields: [user_id], references: [id], onDelete: Cascade)

  @@unique([company_id, user_id])
  @@index([user_id])
  @@index([company_id])
  @@map("company_members")
}

enum MemberRole {
  OWNER
  ADMIN
  TECNICO
}

// ─── Cliente (tabela de negócio — tem company_id obrigatório) ─────────────────

model Customer {
  id                   String        @id @default(uuid())
  company_id           String                               // FK obrigatória — NUNCA NULL
  name                 String
  type                 CustomerType?
  tax_id               String?                              // CPF ou CNPJ
  phone                String?
  email                String?
  city                 String?
  state                String?
  notes                String?
  assigned_to_user_id  String?

  created_at           DateTime      @default(now())
  updated_at           DateTime      @updatedAt

  company              Company       @relation(fields: [company_id], references: [id], onDelete: Cascade)
  assigned_to          User?         @relation("AssignedTo", fields: [assigned_to_user_id], references: [id])

  @@index([company_id])                       // obrigatório — toda query filtra por company_id
  @@index([company_id, name])                 // listagem com busca por nome
  @@map("customers")
}

enum CustomerType {
  PF
  PJ
}

// ─── Refresh Token (para revogação no logout) ─────────────────────────────────

model RefreshToken {
  id          String    @id @default(uuid())
  user_id     String
  token_hash  String    @unique    // SHA-256 do token — nunca guardar o token em si
  expires_at  DateTime
  revoked     Boolean   @default(false)
  created_at  DateTime  @default(now())

  user        User      @relation(fields: [user_id], references: [id], onDelete: Cascade)

  @@index([user_id])
  @@map("refresh_tokens")
}
```

**Observações do schema:**
- `User.email` tem `@unique` — um e-mail por usuário, mas o usuário pode ser membro de múltiplas empresas via `CompanyMember`.
- `Customer.company_id` é NOT NULL — toda query de Customer deve ter `where: { company_id }`. [VERIFIED: ADR-011]
- `RefreshToken.token_hash` guarda SHA-256; o token raw nunca vai ao banco.
- Sem campos de money nesta fase — `Prisma.Decimal` será introduzido na Fase 2 (Orçamento). [VERIFIED: ADR-010]

---

## Don't Hand-Roll

| Problema | Não construir | Usar em vez disso | Por quê |
|----------|---------------|-------------------|---------|
| Hash de senha | Próprio algoritmo | `argon2` (npm) | Timing attacks, salt management, PHC winner |
| JWT sign/verify | `jsonwebtoken` direto | `@nestjs/jwt` + `JwtService` | Integra com DI do NestJS; evita instanciação manual |
| Extração de Bearer token | Regex manual no header | `ExtractJwt.fromAuthHeaderAsBearerToken()` (passport-jwt) | Handles edge cases de Authorization header |
| Cache Redis | Objeto Map em memória | `ioredis` | Persistência entre restarts; suporte a TTL; conexão pooling |
| Validação de schema | Validação manual com if/else | `zod` | Type inference; mensagens de erro estruturadas |
| Proteção de rota no Next.js | Redirect em cada `page.tsx` | `middleware.ts` | Centralizado; roda no edge antes do render |
| Armazenamento seguro no mobile | AsyncStorage (não seguro) | `expo-secure-store` | Usa Keychain (iOS) e Keystore (Android) |

---

## shared-types DTOs com Zod

Todos os schemas abaixo ficam em `packages/shared-types/src/`. São importados por backend (como fonte da validação), mobile e web (type safety).

```typescript
// packages/shared-types/src/auth/signup-step1.dto.ts
import { z } from 'zod';

export const SignupStep1Schema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  phone: z.string().optional(),
  password: z.string().min(8).max(72), // argon2 tem limite de 72 bytes
  accepted_terms: z.literal(true),
});

export type SignupStep1Dto = z.infer<typeof SignupStep1Schema>;
```

```typescript
// packages/shared-types/src/auth/signup-step2.dto.ts
import { z } from 'zod';

export const SignupStep2Schema = z.object({
  trade_name: z.string().min(2).max(100),
  document_type: z.enum(['CPF', 'CNPJ']).optional(),
  document: z.string().optional(),
  phone: z.string().optional(),
  city: z.string().optional(),
  state: z.string().length(2).toUpperCase().optional(),
  brand_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  pix_key: z.string().optional(),
});

export type SignupStep2Dto = z.infer<typeof SignupStep2Schema>;
```

```typescript
// packages/shared-types/src/auth/login.dto.ts
import { z } from 'zod';

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export type LoginDto = z.infer<typeof LoginSchema>;

export const LoginResponseSchema = z.object({
  access_token: z.string(),
  user: z.object({ id: z.string(), name: z.string(), email: z.string() }),
  company: z.object({ id: z.string(), trade_name: z.string() }),
});

export type LoginResponseDto = z.infer<typeof LoginResponseSchema>;
```

```typescript
// packages/shared-types/src/customer/customer-create.dto.ts
import { z } from 'zod';

export const CustomerCreateSchema = z.object({
  name: z.string().min(1).max(150),
  type: z.enum(['PF', 'PJ']).optional(),
  tax_id: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  city: z.string().optional(),
  state: z.string().length(2).optional(),
  notes: z.string().max(1000).optional(),
  assigned_to_user_id: z.string().uuid().optional(),
});

export type CustomerCreateDto = z.infer<typeof CustomerCreateSchema>;
```

```typescript
// packages/shared-types/src/customer/customer-list.dto.ts
import { z } from 'zod';

export const CustomerListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
});

export type CustomerListQueryDto = z.infer<typeof CustomerListQuerySchema>;

export const CustomerSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  type: z.enum(['PF', 'PJ']).nullable(),
  phone: z.string().nullable(),
  email: z.string().nullable(),
  city: z.string().nullable(),
  state: z.string().nullable(),
  created_at: z.string(), // ISO string na API
});

export type CustomerDto = z.infer<typeof CustomerSchema>;
```

**Validação no backend:** Usar `ZodPipe` (NestJS pipe customizado) ou `class-transformer` + Zod para validar body dos endpoints. Alternativa: usar `class-validator` com decorators `@IsString()` etc. no backend apenas, mantendo Zod somente no `shared-types`. A recomendação é usar Zod diretamente no backend via pipe customizado — consistência total com `shared-types`.

---

## Multi-tenant Isolation Testing

### Padrão de teste de isolamento

O teste abaixo roda em CI (Jest + `@nestjs/testing`). Cria dois tenants distintos, cria um customer em cada, e verifica que nenhum vazamento ocorre.

```typescript
// apps/backend/src/customer/customer.isolation.spec.ts
describe('Customer — Multi-tenant isolation', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  // Tenant A
  let tokenA: string;
  let companyIdA: string;

  // Tenant B
  let tokenB: string;
  let companyIdB: string;

  beforeAll(async () => {
    // Criar 2 usuários + 2 empresas distintas no banco de teste
    // Fazer login com cada um e obter access_token
    // ...setup via PrismaService direto (não via HTTP)
  });

  afterAll(async () => {
    await prisma.customer.deleteMany();
    await prisma.companyMember.deleteMany();
    await prisma.company.deleteMany();
    await prisma.user.deleteMany();
    await app.close();
  });

  it('empresa A não consegue listar clientes da empresa B', async () => {
    // Criar customer em B
    await request(app.getHttpServer())
      .post('/customers')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ name: 'Cliente da Empresa B' })
      .expect(201);

    // Listar customers como A — deve retornar array vazio
    const res = await request(app.getHttpServer())
      .get('/customers')
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);

    expect(res.body.data).toHaveLength(0); // A não vê customer de B
  });

  it('empresa A não consegue ler customer da empresa B por ID', async () => {
    const customerB = await prisma.customer.findFirst({
      where: { company_id: companyIdB },
    });

    await request(app.getHttpServer())
      .get(`/customers/${customerB.id}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(404); // não 403 — não vazar que o recurso existe
  });
});
```

**Configuração do banco de teste:** usar banco separado `DATABASE_URL_TEST` ou transações que fazem rollback. Recomendação: `DATABASE_URL_TEST` apontando para database `orcivo_test` no mesmo PostgreSQL do docker-compose.

---

## Common Pitfalls

### Pitfall 1: company_id faltando no WHERE de queries de domínio

**O que dá errado:** Desenvolvedor cria `CustomerService.findAll()` e faz `prisma.customer.findMany()` sem filtrar por `company_id`. Todos os clientes de todos os tenants são retornados.

**Por que acontece:** Prisma não tem Row Level Security nativo — o filtro é responsabilidade do código.

**Como evitar:** TenantGuard injeta `request.companyId`; service recebe como parâmetro obrigatório. Teste de isolamento em CI. Lint rule customizada pode ser adicionada para detectar `prisma.customer.findMany` sem `where.company_id`.

**Warning signs:** Query retorna mais registros do que esperado; teste de isolamento falha no CI.

### Pitfall 2: Refresh token aceito como access token

**O que dá errado:** Se os dois tokens usam o mesmo segredo JWT, um refresh token pode ser enviado como Bearer e ser aceito pelo JwtStrategy.

**Como evitar:** `JWT_ACCESS_SECRET` e `JWT_REFRESH_SECRET` são valores distintos no `.env`. `RefreshTokenStrategy` usa `secretOrKey: JWT_REFRESH_SECRET` e só é ativo na rota `POST /auth/refresh`.

### Pitfall 3: expo-secure-store bloqueante em Expo SDK 51+

**O que dá errado:** `SecureStore.getItemAsync()` pode retornar `null` na primeira renderização enquanto o token ainda está sendo lido. Exibir a tela de login brevemente antes de redirecionar para o app.

**Como evitar:** `AuthContext` começa com `isLoading: true`; `RootNavigator` exibe `SplashScreen` até `isLoading` ser `false`.

### Pitfall 4: Expo SDK 51 com react-navigation v7 — configuração de telas nativas

**O que dá errado:** `react-native-screens` exige `enableScreens()` ser chamado antes do `NavigationContainer`. Se não for chamado, navegação usa views nativas mas sem otimização de memória.

**Como evitar:**
```typescript
// App.tsx — antes do NavigationContainer
import { enableScreens } from 'react-native-screens';
enableScreens();
```

### Pitfall 5: Next.js middleware lendo cookie em rota de API

**O que dá errado:** O matcher padrão pode interceptar rotas `/api/*` e redirecionar chamadas do backend para `/login`.

**Como evitar:** Regex do matcher exclui `/api/`:
```typescript
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
```

### Pitfall 6: argon2 com senha > 72 bytes silenciosamente truncada

**O que dá errado:** argon2 trunka silenciosamente passwords maiores que 72 bytes. Um usuário com senha de 80 chars e outro com os primeiros 72 chars idênticos passariam a ter o mesmo hash.

**Como evitar:** Validar no Zod: `z.string().min(8).max(72)`. [ASSUMED — comportamento documentado do argon2; verificar na lib se necessário]

---

## State of the Art

| Abordagem antiga | Abordagem atual | Desde | Impacto |
|-----------------|----------------|-------|---------|
| `bcrypt` para senhas | `argon2` | PHC 2015 | Argon2id é o padrão recomendado para novos sistemas |
| Refresh token em Redis | Refresh token hash no banco | 2022+ | Banco permite query por user_id para revogar todas as sessões |
| `pages/` router (Next.js) | `app/` router com route groups | Next.js 13.4+ | Route groups `(auth)` e `(app)` são a forma canônica de layouts condicionais |
| `react-navigation` v5/v6 | `react-navigation` v7 (atual) | 2024 | API ligeiramente diferente para `createNativeStackNavigator` |
| `AsyncStorage` para tokens | `expo-secure-store` | Sempre foi preferível | Keychain/Keystore vs storage não criptografado |

---

## Assumptions Log

| # | Claim | Seção | Risco se Errado |
|---|-------|-------|----------------|
| A1 | argon2 silenciosamente trunca passwords > 72 bytes | Pitfall 6 | Segurança — verificar comportamento exato na versão 0.44.0 |
| A2 | Expo SDK 51 é compatível com react-navigation v7 | Standard Stack | Pode exigir ajuste de versão em peer deps |
| A3 | `expo-secure-store` v56 mantém API `getItemAsync`/`setItemAsync` | Code Examples | Pode exigir ajuste de chamada se API mudou |
| A4 | Reset de senha: diferir para Fase 2 | Decisão a critério do planner | Nenhum — é área de discrição do planner |

---

## Open Questions (RESOLVED)

1. **Reset de senha (D-19)**
   - O que sabemos: está marcado como "pode incluir ou diferir — menos crítico para o molde arquitetural"
   - O que estava em aberto: inclui ou não na Fase 1?
   - **RESOLVED: deferido para Fase 2.** Requer integração com Resend (email) e fluxo de token one-time. Não faz parte do molde arquitetural que outras features vão replicar. ADR-012 registra o deferimento.

2. **Refresh token: cookie httpOnly vs SecureStore no mobile**
   - O que sabemos: web usa cookie httpOnly (decisão boa — inacessível ao JS); mobile não tem cookies nativos.
   - O que estava em aberto: mobile envia refresh token como header `X-Refresh-Token` ou como body de `POST /auth/refresh`?
   - **RESOLVED: mobile envia `{ refresh_token: "<token>" }` no body de `POST /auth/refresh`.** Token armazenado no `expo-secure-store`. Web envia o cookie httpOnly automaticamente via browser. P02 e P05 implementam esta decisão.

---

## Environment Availability

| Dependência | Requerida por | Disponível | Versão | Fallback |
|-------------|--------------|-----------|--------|---------|
| PostgreSQL 16 | Prisma / dados | Via Docker Compose (infra/) | 16-alpine | — |
| Redis 7 | Cache de membership + idempotência | Via Docker Compose (infra/) | 7-alpine | — |
| Node.js | Backend / Web | Sim | v24.11.1 | — |
| pnpm | Monorepo | Sim (assumido da Fase 0) | — | — |
| Expo CLI | Mobile | Sim (expo ~51 já instalado) | 51.x | — |

[VERIFIED: docker-compose.yml confirma PostgreSQL 16-alpine e Redis 7-alpine]
[VERIFIED: `node --version` = v24.11.1]

---

## Validation Architecture

### Test Framework

| Propriedade | Valor |
|-------------|-------|
| Framework | Jest 29 (já configurado no `apps/backend/package.json`) |
| Config | `apps/backend/jest` section no `package.json` |
| Quick run | `cd apps/backend && pnpm test -- --testPathPattern=customer.isolation` |
| Full suite | `cd apps/backend && pnpm test` |

### Phase Requirements → Test Map

| Req ID | Comportamento | Tipo de Teste | Comando Automatizado | Arquivo Existe? |
|--------|--------------|---------------|---------------------|----------------|
| AUTH-01 | Signup cria User + Company + CompanyMember no banco | integration | `pnpm test -- --testPathPattern=auth.e2e` | ❌ Wave 0 |
| AUTH-02 | Login retorna access_token + refresh_token válidos | integration | `pnpm test -- --testPathPattern=auth.e2e` | ❌ Wave 0 |
| AUTH-03 | TenantGuard injeta companyId correto no request | unit | `pnpm test -- --testPathPattern=tenant.guard.spec` | ❌ Wave 0 |
| AUTH-04 | Logout revoga refresh token (próximo uso retorna 401) | integration | `pnpm test -- --testPathPattern=auth.e2e` | ❌ Wave 0 |
| TENANT-01 | Customer criado sem company_id rejeitado no banco | unit | `pnpm test -- --testPathPattern=customer.service.spec` | ❌ Wave 0 |
| TENANT-02 | Empresa A não acessa Customer da empresa B | integration | `pnpm test -- --testPathPattern=customer.isolation.spec` | ❌ Wave 0 |
| CUSTOMER-01 | POST /customers cria com company_id correto | integration | `pnpm test -- --testPathPattern=customer.e2e` | ❌ Wave 0 |
| CUSTOMER-01 | GET /customers retorna apenas customers do tenant | integration | `pnpm test -- --testPathPattern=customer.e2e` | ❌ Wave 0 |
| TYPES-01 | Zod schemas validam DTOs corretos e rejeitam inválidos | unit | `pnpm test` (em packages/shared-types) | ❌ Wave 0 |

### Sampling Rate

- **Por commit de tarefa:** `pnpm test -- --testPathPattern=<módulo>` (< 30s)
- **Por merge de wave:** `pnpm test` completo no backend + `pnpm typecheck` em todos os packages
- **Gate da fase:** Suite completa verde + teste de isolamento TENANT-02 obrigatoriamente verde antes de `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `apps/backend/src/auth/auth.e2e.spec.ts` — cobre AUTH-01, AUTH-02, AUTH-04
- [ ] `apps/backend/src/auth/guards/tenant.guard.spec.ts` — cobre AUTH-03
- [ ] `apps/backend/src/customer/customer.isolation.spec.ts` — cobre TENANT-02
- [ ] `apps/backend/src/customer/customer.e2e.spec.ts` — cobre CUSTOMER-01
- [ ] `packages/shared-types/src/__tests__/schemas.spec.ts` — cobre TYPES-01
- [ ] `apps/backend/test/setup.ts` — banco de teste (`DATABASE_URL_TEST`)

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Aplica | Controle padrão |
|---------------|--------|----------------|
| V2 Authentication | Sim | argon2 para hash; JWT access + refresh com segredos distintos |
| V3 Session Management | Sim | Refresh token hash no banco; revogação explícita; Redis cache 60s |
| V4 Access Control | Sim | TenantGuard obrigatório; company_id em todo WHERE |
| V5 Input Validation | Sim | Zod schemas em shared-types; ZodPipe no backend |
| V6 Cryptography | Não (nesta fase) | Sem crypto além de argon2 e JWT |

### Known Threat Patterns

| Padrão | STRIDE | Mitigação padrão |
|--------|--------|-----------------|
| Tenant data leak (missing company_id filter) | Information Disclosure | TenantGuard + teste de isolamento em CI |
| JWT token replay após logout | Elevation of Privilege | Revogação de refresh token no banco; Redis invalida membership cache |
| Password brute-force | Elevation of Privilege | Rate limiting em `POST /auth/login` (implementar com `@nestjs/throttler`) |
| Refresh token theft (web) | Elevation of Privilege | Cookie httpOnly + SameSite=Strict; token hash no banco para detectar reuse |
| XSS lendo token (web) | Information Disclosure | Cookie httpOnly — JS não tem acesso |

---

## Project Constraints (from CLAUDE.md)

| Diretiva | Impacto na Fase 1 |
|----------|------------------|
| Money = `Prisma.Decimal` / string / `Decimal.js` | Fase 1 não tem campos monetários; a estrutura de types deve ser estabelecida para Fase 2 |
| Multi-tenant: `company_id` em toda tabela de negócio | `Customer` tem `company_id NOT NULL`; TenantGuard é obrigatório |
| JWT só identifica; autorização via Redis 60s | JwtStrategy não decide acesso; TenantGuard/outros guards revalidam |
| `shared-types` não importa `@prisma/client` | Zod schemas são puros TypeScript; enums duplicados (não importados do Prisma) |
| `WebhookEvent` obrigatório para todo provedor externo | Não aplicável na Fase 1 (sem webhooks) |
| `RequestIdempotency` obrigatório para mutations mobile | `X-Client-Request-Id` header em todas as mutations do mobile |
| ESLint `no-restricted-imports` bloqueando `@prisma/*` no mobile/web | Já previsto na estrutura do monorepo (Fase 0) |
| Ícones: Lucide only | `lucide-react-native` no mobile, `lucide-react` no web |
| Fonte web: Inter | Já presente no `layout.tsx` existente |
| UI pt-BR | Labels, placeholders, mensagens de erro em português |
| Nomes de plano: Orcivo Livre/Solo/Mais/Equipe | `PlanCode` enum usa LIVRE/SOLO/MAIS/EQUIPE — nunca FREE/PRO/TOP |
| Commits sem referência a IA | Commits no formato `feat(auth): add signup endpoint` |

---

## Sources

### Primary (HIGH confidence)
- Context7 `/nestjs/docs.nestjs.com` — JwtStrategy, AuthGuard, Public decorator, guards
- Context7 `/nestjs/jwt` — JwtService.sign, verify, signAsync
- Context7 `/websites/prisma_io` — schema relations, indexes, foreign keys
- Context7 `/react-navigation/react-navigation.github.io` — bottom tabs, nested navigators, auth stack pattern
- Context7 `/vercel/next.js` — middleware auth, route groups, App Router layout
- Context7 `/colinhacks/zod` — z.object, z.infer, schema composition
- ADR-005, ADR-006, ADR-010, ADR-011 — decisões arquiteturais do projeto (fonte autoritativa)
- CLAUDE.md + PROJECT.md — regras absolutas e stack travada

### Secondary (MEDIUM confidence)
- npm registry — versões verificadas em 2026-05-22 para todos os packages listados
- `infra/docker-compose.yml` — confirma PostgreSQL 16-alpine e Redis 7-alpine

### Tertiary (LOW confidence)
- Comportamento de argon2 com senha > 72 bytes [A1] — documentação indireta; verificar na lib

---

## Metadata

**Confidence breakdown:**
- Standard Stack: HIGH — versões verificadas no npm registry em 2026-05-22
- Auth Module Structure: HIGH — verificado em Context7 NestJS docs + ADR-006
- Prisma Schema: HIGH — verificado em Context7 Prisma docs + ADR-011
- React Navigation: HIGH — verificado em Context7 react-navigation docs
- Next.js Layout: HIGH — verificado em Context7 Next.js docs
- Multi-tenant Testing: HIGH — padrão derivado de ADR-011 + Jest configurado no projeto
- shared-types Zod: HIGH — verificado em Context7 Zod docs + constraint do CLAUDE.md

**Research date:** 2026-05-22
**Valid until:** 2026-06-22 (bibliotecas estáveis; Expo SDK major release pode invalidar navegação)

---

## RESEARCH COMPLETE
