# Phase 1: Vertical Slice — Pattern Map

**Mapped:** 2026-05-22
**Files analyzed:** 32 arquivos novos/modificados
**Analogs found:** 6 / 32 (codebase jovem — maioria sem analog direto; RESEARCH.md é fonte primária)

---

## Nota sobre o estado do codebase

O projeto está na Fase 0 concluída. Existem apenas 6 arquivos fonte relevantes:
- `apps/backend/src/app.module.ts` — módulo raiz NestJS
- `apps/backend/src/health/health.module.ts` — módulo simples (analog para todos os módulos NestJS)
- `apps/backend/src/health/health.controller.ts` — controller simples (analog para controllers)
- `apps/backend/src/main.ts` — bootstrap (não modificar estrutura, apenas registrar módulos)
- `apps/web/app/layout.tsx` — root layout Next.js (analog para novos layouts)
- `apps/web/app/page.tsx` — page Next.js com Server Component + fetch (analog para pages)
- `apps/mobile/App.tsx` — entry point Expo com StyleSheet e cores Orcivo (analog para estilos)
- `packages/shared-types/src/index.ts` — barrel export com regra crítica no cabeçalho

Para arquivos sem analog direto, os excerpts são extraídos do RESEARCH.md (padrões verificados em Context7 + ADRs do projeto).

---

## File Classification

| Arquivo novo/modificado | Role | Data Flow | Analog mais próximo | Qualidade |
|------------------------|------|-----------|---------------------|-----------|
| `prisma/schema.prisma` | config | batch | — | sem analog |
| `apps/backend/src/app.module.ts` *(mod.)* | config | — | si mesmo | exact |
| `apps/backend/src/prisma/prisma.module.ts` | config | — | `health/health.module.ts` | role-match |
| `apps/backend/src/prisma/prisma.service.ts` | service | CRUD | — | sem analog |
| `apps/backend/src/redis/redis.module.ts` | config | — | `health/health.module.ts` | role-match |
| `apps/backend/src/redis/redis.service.ts` | service | request-response | — | sem analog |
| `apps/backend/src/auth/auth.module.ts` | config | — | `health/health.module.ts` | role-match |
| `apps/backend/src/auth/auth.controller.ts` | controller | request-response | `health/health.controller.ts` | role-match |
| `apps/backend/src/auth/auth.service.ts` | service | request-response | — | sem analog |
| `apps/backend/src/auth/strategies/jwt.strategy.ts` | middleware | request-response | — | sem analog |
| `apps/backend/src/auth/strategies/refresh-token.strategy.ts` | middleware | request-response | — | sem analog |
| `apps/backend/src/auth/guards/jwt-auth.guard.ts` | middleware | request-response | — | sem analog |
| `apps/backend/src/auth/guards/tenant.guard.ts` | middleware | request-response | — | sem analog |
| `apps/backend/src/auth/decorators/public.decorator.ts` | utility | — | — | sem analog |
| `apps/backend/src/auth/decorators/current-user.decorator.ts` | utility | — | — | sem analog |
| `apps/backend/src/company/company.module.ts` | config | — | `health/health.module.ts` | role-match |
| `apps/backend/src/company/company.controller.ts` | controller | request-response | `health/health.controller.ts` | role-match |
| `apps/backend/src/company/company.service.ts` | service | CRUD | — | sem analog |
| `apps/backend/src/customer/customer.module.ts` | config | — | `health/health.module.ts` | role-match |
| `apps/backend/src/customer/customer.controller.ts` | controller | CRUD | `health/health.controller.ts` | role-match |
| `apps/backend/src/customer/customer.service.ts` | service | CRUD | — | sem analog |
| `apps/backend/src/customer/customer.isolation.spec.ts` | test | CRUD | — | sem analog |
| `packages/shared-types/src/index.ts` *(mod.)* | config | — | si mesmo | exact |
| `packages/shared-types/src/auth/*.dto.ts` | utility | — | — | sem analog |
| `packages/shared-types/src/customer/*.dto.ts` | utility | — | — | sem analog |
| `apps/mobile/App.tsx` *(mod.)* | config | — | si mesmo | exact |
| `apps/mobile/src/navigation/RootNavigator.tsx` | component | event-driven | `apps/mobile/App.tsx` | partial |
| `apps/mobile/src/navigation/AuthStack.tsx` | component | event-driven | — | sem analog |
| `apps/mobile/src/navigation/AppTabs.tsx` | component | event-driven | — | sem analog |
| `apps/mobile/src/contexts/AuthContext.tsx` | provider | event-driven | — | sem analog |
| `apps/mobile/src/services/api.ts` | service | request-response | `apps/web/app/page.tsx` | partial |
| `apps/web/app/middleware.ts` | middleware | request-response | — | sem analog |
| `apps/web/app/(auth)/layout.tsx` | component | — | `apps/web/app/layout.tsx` | role-match |
| `apps/web/app/(app)/layout.tsx` | component | — | `apps/web/app/layout.tsx` | role-match |
| `apps/web/app/(app)/clientes/page.tsx` | component | CRUD | `apps/web/app/page.tsx` | role-match |

---

## Pattern Assignments

### Grupo 1 — Módulos NestJS (todos os `*.module.ts`)

**Analog:** `apps/backend/src/health/health.module.ts`

**Padrão de módulo** (linhas 1–7):
```typescript
import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';

@Module({
  controllers: [HealthController],
})
export class HealthModule {}
```

**Regra de extensão para módulos de domínio** — todo módulo de domínio segue esta estrutura, adicionando `providers` e `imports` conforme necessário:
```typescript
@Module({
  imports: [PrismaModule, RedisModule],   // dependências de infra
  controllers: [CustomerController],
  providers: [CustomerService],
  exports: [CustomerService],             // exportar apenas se outro módulo precisar injetar
})
export class CustomerModule {}
```

**app.module.ts modificado** — registrar todos os módulos filhos (linhas 1–7 do arquivo atual):
```typescript
import { Module } from '@nestjs/common';
import { HealthModule } from './health/health.module';
// Fase 1: adicionar abaixo
// import { ConfigModule } from '@nestjs/config';
// import { PrismaModule } from './prisma/prisma.module';
// import { RedisModule } from './redis/redis.module';
// import { AuthModule } from './auth/auth.module';
// import { CompanyModule } from './company/company.module';
// import { CustomerModule } from './customer/customer.module';

@Module({
  imports: [HealthModule],
})
export class AppModule {}
```

---

### Grupo 2 — Controllers NestJS (`auth.controller.ts`, `company.controller.ts`, `customer.controller.ts`)

**Analog:** `apps/backend/src/health/health.controller.ts`

**Padrão de controller existente** (linhas 1–12):
```typescript
import { Controller, Get } from '@nestjs/common';

@Controller()
export class HealthController {
  @Get('health')
  health(): { status: string; timestamp: string } {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
```

**Extensão para controller de domínio** — adicionar injeção de serviço, guards e tipagem do request. Padrão verificado em RESEARCH.md (Context7 NestJS docs):
```typescript
import { Controller, Get, Post, Body, Req, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { CustomerService } from './customer.service';
import { CustomerCreateDto } from '@orcivo/shared-types';

@Controller('customers')
@UseGuards(JwtAuthGuard, TenantGuard)   // ordem obrigatória: JWT primeiro, depois Tenant
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  @Get()
  async findAll(@Req() req: Request & { companyId: string }) {
    return this.customerService.findAll(req.companyId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() dto: CustomerCreateDto,
    @Req() req: Request & { companyId: string },
  ) {
    return this.customerService.create(dto, req.companyId);
  }
}
```

**Rotas públicas** (sem guards) usam o decorator `@Public()`:
```typescript
@Controller('auth')
export class AuthController {
  @Post('signup/user')
  @Public()   // marca a rota como pública — o JwtAuthGuard global pula
  async signupUser(@Body() dto: SignupStep1Dto) { ... }
}
```

---

### Grupo 3 — `prisma/schema.prisma`

**Analog:** sem analog (arquivo novo no projeto)

**Padrão completo** — copiar diretamente do RESEARCH.md seção "Prisma Schema — Fase 1". Pontos críticos:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

Regras de nomenclatura obrigatórias (ADR-011):
- Tabelas: `@@map("snake_case_plural")` — ex: `@@map("customers")`
- FK de tenant: `company_id String` — NOT NULL em toda tabela de negócio, sem exceção
- Índice obrigatório em cada tabela de negócio: `@@index([company_id])`
- Enum `PlanCode`: valores `LIVRE | SOLO | MAIS | EQUIPE` — nunca `FREE | PRO | TOP`

---

### Grupo 4 — `apps/backend/src/prisma/prisma.service.ts`

**Analog:** sem analog direto

**Padrão singleton PrismaClient** — padrão verificado em Context7 Prisma docs:
```typescript
import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect();
  }
}
```

**prisma.module.ts** — exportar como global para não precisar importar em cada módulo:
```typescript
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

---

### Grupo 5 — `apps/backend/src/redis/redis.service.ts`

**Analog:** sem analog direto

**Padrão singleton ioredis** — padrão verificado em RESEARCH.md (Context7 NestJS):
```typescript
import { Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private client: Redis;

  constructor(private configService: ConfigService) {
    this.client = new Redis({
      host: configService.get('REDIS_HOST', 'localhost'),
      port: configService.get<number>('REDIS_PORT', 6379),
    });
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async setex(key: string, seconds: number, value: string): Promise<void> {
    await this.client.setex(key, seconds, value);
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  async onModuleDestroy() {
    await this.client.quit();
  }
}
```

---

### Grupo 6 — `apps/backend/src/auth/strategies/jwt.strategy.ts`

**Analog:** sem analog direto

**Padrão JwtStrategy** — padrão verificado em RESEARCH.md (Context7 NestJS docs + ADR-006):
```typescript
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../../redis/redis.service';
import { PrismaService } from '../../prisma/prisma.service';

interface JwtPayload {
  sub: string;    // user.id (UUID)
  email: string;
  iat?: number;
  exp?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private configService: ConfigService,
    private redisService: RedisService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
    });
  }

  async validate(payload: JwtPayload) {
    // JWT só identifica — autorização revalida via Redis cache 60s (regra travada CLAUDE.md)
    const cacheKey = `membership:${payload.sub}`;
    let cached = await this.redisService.get(cacheKey);
    if (!cached) {
      const member = await this.prisma.companyMember.findFirst({
        where: { user_id: payload.sub, active: true },
        select: { company_id: true },
      });
      if (!member) throw new UnauthorizedException();
      cached = member.company_id;
      await this.redisService.setex(cacheKey, 60, cached);
    }
    return { userId: payload.sub, email: payload.email };
  }
}
```

**Separação de segredos obrigatória:** `JWT_ACCESS_SECRET` ≠ `JWT_REFRESH_SECRET`. `RefreshTokenStrategy` usa `secretOrKey: configService.getOrThrow('JWT_REFRESH_SECRET')`.

---

### Grupo 7 — `apps/backend/src/auth/guards/tenant.guard.ts`

**Analog:** sem analog direto

**Padrão TenantGuard** — padrão verificado em RESEARCH.md (ADR-011):
```typescript
import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';

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

    request.companyId = companyId; // disponível em todos os handlers via @Req()
    return true;
  }
}
```

**Ordem de aplicação:** `JwtAuthGuard` sempre antes de `TenantGuard`. Aplicar `@UseGuards(JwtAuthGuard, TenantGuard)` em todo controller de domínio.

---

### Grupo 8 — `apps/backend/src/auth/decorators/public.decorator.ts`

**Analog:** sem analog direto

**Padrão @Public() decorator** — padrão verificado em RESEARCH.md (Context7 NestJS docs):
```typescript
import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
```

**Uso no JwtAuthGuard:**
```typescript
import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;
    return super.canActivate(context);
  }
}
```

---

### Grupo 9 — `packages/shared-types/src/index.ts` (modificado) e DTOs Zod

**Analog:** `packages/shared-types/src/index.ts` (si mesmo)

**Cabeçalho obrigatório** (linhas 1–4 do arquivo atual — PRESERVAR):
```typescript
// @orcivo/shared-types — DTOs, Zod schemas, enums
// REGRA CRITICA: NAO importar @prisma/client, @nestjs/*, react, react-native neste package
// Este package e consumido por backend, mobile e web — deve ser agnostico de framework
```

**Padrão de schema Zod** — copiar estrutura do RESEARCH.md seção "shared-types DTOs com Zod":
```typescript
import { z } from 'zod';

export const SignupStep1Schema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  phone: z.string().optional(),
  password: z.string().min(8).max(72),  // argon2 silenciosamente trunka > 72 bytes
  accepted_terms: z.literal(true),
});

export type SignupStep1Dto = z.infer<typeof SignupStep1Schema>;
// Exportar sempre: Schema (para validação runtime) + Dto (para type inference)
```

**Enums duplicados** — nunca importar de `@prisma/client`; redeclara-los em shared-types:
```typescript
export const CustomerTypeEnum = z.enum(['PF', 'PJ']);
export type CustomerType = z.infer<typeof CustomerTypeEnum>;

export const PlanCodeEnum = z.enum(['LIVRE', 'SOLO', 'MAIS', 'EQUIPE']);
// Nunca: FREE, PRO, TOP — regra absoluta CLAUDE.md
```

---

### Grupo 10 — `apps/mobile/App.tsx` (modificado) e navegação

**Analog:** `apps/mobile/App.tsx` (si mesmo)

**Padrões estabelecidos do App.tsx existente** (linhas 11, 76–142) — preservar:
- Cor primária: `#6D28D9` (roxo Orcivo) — usada em `ActivityIndicator`, `button` background
- Fundo: `#FFFFFF` — usada no container
- Texto secundário: `#6B7280` — para taglines e labels menores
- Borda: `#E5E7EB` — cards e separadores
- Erro: `#DC2626` — estados de erro
- Sucesso: `#059669` — estados de sucesso
- `StyleSheet.create()` — todas as definições de estilo fora do componente
- `EXPO_PUBLIC_API_URL` — variável de ambiente com prefixo `EXPO_PUBLIC_`

**Padrão RootNavigator** — copiar do RESEARCH.md Pattern 3:
```typescript
// apps/mobile/src/navigation/RootNavigator.tsx
import { enableScreens } from 'react-native-screens';
enableScreens();  // obrigatório antes do NavigationContainer

import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../contexts/AuthContext';

const Stack = createNativeStackNavigator();

export function RootNavigator() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <SplashScreen />;   // evita flash de tela de login

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <Stack.Screen name="AppTabs" component={AppTabs} />
        ) : (
          <Stack.Screen name="AuthStack" component={AuthStack} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
```

**App.tsx modificado** — substituir todo o conteúdo, manter apenas o wrapper:
```typescript
import { RootNavigator } from './src/navigation/RootNavigator';
import { AuthProvider } from './src/contexts/AuthContext';

export default function App() {
  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}
```

**AppTabs — bottom tabs** (5 tabs exatas — D-06):
```typescript
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Home, Users, FileText, Calendar, MoreHorizontal } from 'lucide-react-native';
// Lucide only — sem emoji, sem custom icons (regra CLAUDE.md)

const Tab = createBottomTabNavigator();

export function AppTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarActiveTintColor: '#6D28D9',  // --purple-600
        tabBarInactiveTintColor: '#6B7280',
        headerShown: false,
      })}
    >
      <Tab.Screen name="Início" component={InicioScreen}
        options={{ tabBarIcon: ({ color }) => <Home color={color} size={22} /> }} />
      <Tab.Screen name="Clientes" component={ClientesScreen}
        options={{ tabBarIcon: ({ color }) => <Users color={color} size={22} /> }} />
      <Tab.Screen name="Orçamentos" component={EmBreveScreen}
        options={{ tabBarIcon: ({ color }) => <FileText color={color} size={22} /> }} />
      <Tab.Screen name="Agenda" component={EmBreveScreen}
        options={{ tabBarIcon: ({ color }) => <Calendar color={color} size={22} /> }} />
      <Tab.Screen name="Mais" component={MaisStack}
        options={{ tabBarIcon: ({ color }) => <MoreHorizontal color={color} size={22} /> }} />
    </Tab.Navigator>
  );
}
```

**api.ts — fetch wrapper com idempotência** (regra travada CLAUDE.md):
```typescript
// apps/mobile/src/services/api.ts
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://api.seudominio.com.br';

export async function post<T>(path: string, body: unknown): Promise<T> {
  const idempotencyKey = Crypto.randomUUID();  // X-Client-Request-Id obrigatório em mutations
  const token = await SecureStore.getItemAsync('access_token');
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      'X-Client-Request-Id': idempotencyKey,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

export async function get<T>(path: string): Promise<T> {
  const token = await SecureStore.getItemAsync('access_token');
  const res = await fetch(`${API_URL}${path}`, {
    headers: {
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<T>;
}
```

---

### Grupo 11 — `apps/web/app/layout.tsx` e layouts de grupo de rotas

**Analog:** `apps/web/app/layout.tsx` (si mesmo)

**Root layout existente** (linhas 1–15 — PRESERVAR, não reescrever):
```typescript
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Orcivo',
  description: 'Para técnicos que constroem negócios',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="bg-white text-[#0A0A0F] antialiased">{children}</body>
    </html>
  );
}
```

**Cores Tailwind inline** — padrão estabelecido em `page.tsx`: usar `text-[#6D28D9]` para o roxo primário, `text-gray-500` para texto secundário, `border-gray-200` para bordas.

**Layout (app) com sidebar** — padrão App Router route groups:
```typescript
// apps/web/app/(app)/layout.tsx
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-white">
      <Sidebar />              {/* largura 260px — design handoff */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar />             {/* altura 64px — design handoff */}
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
```

**Layout (auth) sem sidebar:**
```typescript
// apps/web/app/(auth)/layout.tsx
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      {children}
    </div>
  );
}
```

---

### Grupo 12 — `apps/web/middleware.ts`

**Analog:** sem analog direto

**Padrão middleware Next.js** — copiar diretamente do RESEARCH.md Pattern 4:
```typescript
// apps/web/middleware.ts
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
  // Excluir /api/ para não interceptar chamadas de API (Pitfall 5 do RESEARCH.md)
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
```

---

### Grupo 13 — `apps/web/app/page.tsx` (Server Component com fetch)

**Analog:** `apps/web/app/page.tsx` (si mesmo — padrão estabelecido)

**Padrão Server Component existente** (linhas 1–41):
- Função `async` exportada como `default` — Server Component
- `fetch()` com `cache: 'no-store'` para dados dinâmicos
- `signal: AbortSignal.timeout(5000)` para timeout
- Retorno `null` em caso de erro — trata ausência de dados no JSX
- Classes Tailwind inline sem CSS separado
- Sem `'use client'` — preferir Server Components onde possível

**Para `/app/clientes/page.tsx`:**
```typescript
// 'use client' apenas se precisar de interatividade (formulário, estado)
// Para listagem inicial, manter como Server Component com fetch server-side
import { CustomerDto } from '@orcivo/shared-types';

async function getCustomers(token: string): Promise<CustomerDto[]> {
  const res = await fetch(`${process.env.API_URL}/customers`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.data ?? [];
}
```

---

### Grupo 14 — Tests (`*.spec.ts` e `*.e2e.spec.ts`)

**Analog:** sem analog direto (nenhum teste existe ainda)

**Configuração Jest existente** em `apps/backend/package.json` (linhas 38–45):
```json
"jest": {
  "moduleFileExtensions": ["js", "json", "ts"],
  "rootDir": "src",
  "testRegex": ".*\\.spec\\.ts$",
  "transform": { "^.+\\.(t|j)s$": "ts-jest" },
  "coverageDirectory": "../coverage",
  "testEnvironment": "node"
}
```

**Padrão de teste de isolamento multi-tenant** — copiar estrutura do RESEARCH.md seção "Multi-tenant Isolation Testing":
```typescript
// apps/backend/src/customer/customer.isolation.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';

describe('Customer — isolamento multi-tenant', () => {
  let app: INestApplication;
  // setup: criar 2 tenants, obter tokens, verificar vazamento
  // teardown: deletar dados de teste em ordem (customer → member → company → user)
});
```

**Banco de teste:** `DATABASE_URL_TEST` apontando para `orcivo_test` no mesmo PostgreSQL do docker-compose. Criar `apps/backend/test/setup.ts` para configuração global.

---

## Shared Patterns

### Autenticação (aplicar a todos os controllers de domínio)

**Fonte:** RESEARCH.md Pattern 2 + Pattern na Seção Guards
**Aplicar a:** `customer.controller.ts`, `company.controller.ts`

```typescript
// Decoradores obrigatórios em todo controller de domínio
@Controller('customers')
@UseGuards(JwtAuthGuard, TenantGuard)  // ordem importa — JWT extrai user, Tenant extrai company
export class CustomerController {
  // handler recebe companyId via req.companyId — injetado pelo TenantGuard
}
```

### company_id em todo WHERE de domínio

**Fonte:** ADR-011 + RESEARCH.md Anti-Patterns
**Aplicar a:** `customer.service.ts`, `company.service.ts` e todos os services futuros

```typescript
// Toda query de domínio DEVE ter company_id no WHERE — sem exceção
async findAll(companyId: string) {
  return this.prisma.customer.findMany({
    where: { company_id: companyId },  // obrigatório
    orderBy: { created_at: 'desc' },
  });
}

// 404 ao invés de 403 para recursos de outro tenant — não vazar existência (RESEARCH.md)
async findOne(id: string, companyId: string) {
  const customer = await this.prisma.customer.findFirst({
    where: { id, company_id: companyId },  // compound filter
  });
  if (!customer) throw new NotFoundException();  // nunca ForbiddenException
}
```

### Tokens de design (aplicar a todos os arquivos mobile e web)

**Fonte:** `apps/mobile/App.tsx` (padrão estabelecido) + `apps/web/app/page.tsx` + CLAUDE.md

| Token | Valor | Uso |
|-------|-------|-----|
| `--purple-600` | `#6D28D9` | Primary brand, botões, tintColor ativo, logo |
| `--bg` | `#FFFFFF` | Background de telas e cards |
| `--ink` | `#0A0A0F` | Texto principal |
| Secundário | `#6B7280` | Taglines, labels menores, tintColor inativo |
| Borda | `#E5E7EB` | Cards, separadores |
| Erro | `#DC2626` | Estados de erro |
| Sucesso | `#059669` | Estados de sucesso |

**Ícones:** `lucide-react-native` no mobile, `lucide-react` no web — nunca emoji, nunca custom icons.

### Idioma de UI (aplicar a todos os arquivos de frontend)

**Fonte:** CLAUDE.md — Idioma UI: pt-BR

- Labels de formulário em pt-BR: "Nome", "E-mail", "Telefone", "Senha"
- Mensagens de erro em pt-BR: "Campo obrigatório", "E-mail inválido"
- Textos de placeholder em pt-BR
- Nomenclatura de planos: "Orcivo Livre", "Orcivo Solo", "Orcivo Mais", "Orcivo Equipe"
- Nunca: "FREE", "PRO", "TOP", "ilimitado", "14 dias de teste"

### Variáveis de ambiente

**Fonte:** `apps/mobile/App.tsx` (linha 11) + `apps/web/app/page.tsx` (linha 1) + `apps/backend/src/main.ts`

```
# Backend
process.env.PORT                — porta do servidor (default: 3000)
process.env.ALLOWED_ORIGINS     — CORS origins separadas por vírgula
process.env.DATABASE_URL        — PostgreSQL connection string
process.env.JWT_ACCESS_SECRET   — segredo do access token
process.env.JWT_REFRESH_SECRET  — segredo distinto do refresh token
process.env.REDIS_HOST          — host do Redis (default: localhost)
process.env.REDIS_PORT          — porta do Redis (default: 6379)

# Mobile (prefixo EXPO_PUBLIC_ obrigatório para variáveis acessíveis no cliente)
process.env.EXPO_PUBLIC_API_URL — URL da API

# Web (sem prefixo — acessadas server-side)
process.env.API_URL             — URL da API (server-side fetch)
```

---

## No Analog Found

Arquivos sem correspondência no codebase (usar RESEARCH.md como fonte primária):

| Arquivo | Role | Data Flow | Motivo |
|---------|------|-----------|--------|
| `apps/backend/src/auth/auth.service.ts` | service | request-response | Nenhum service existe; lógica de argon2+JWT é nova |
| `apps/backend/src/auth/strategies/*.ts` | middleware | request-response | Nenhuma strategy Passport existe |
| `apps/backend/src/auth/decorators/*.ts` | utility | — | Nenhum decorator existe |
| `apps/mobile/src/contexts/AuthContext.tsx` | provider | event-driven | Nenhum context existe |
| `apps/mobile/src/screens/**/*.tsx` | component | — | Nenhuma screen existe |
| `apps/web/middleware.ts` | middleware | request-response | Nenhum middleware existe |
| `apps/web/app/(auth)/**` | component | — | Route group `(auth)` não existe |
| `apps/web/app/(app)/**` | component | CRUD | Route group `(app)` não existe |
| `packages/shared-types/src/auth/*.dto.ts` | utility | — | Nenhum DTO existe |
| `packages/shared-types/src/customer/*.dto.ts` | utility | — | Nenhum DTO existe |

Para todos esses, os excerpts do RESEARCH.md seção "shared-types DTOs com Zod", "Architecture Patterns" e "Code Examples" são a fonte autoritativa.

---

## Metadata

**Scope de busca:** `apps/backend/src/`, `apps/mobile/`, `apps/web/app/`, `packages/shared-types/src/`
**Arquivos escaneados:** 8 arquivos fonte (codebase Fase 0)
**Data de extração:** 2026-05-22
**Fonte primária para arquivos sem analog:** RESEARCH.md (Context7 NestJS + React Navigation + Next.js + Prisma + ADRs do projeto)
