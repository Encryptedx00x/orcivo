# Orcivo — Molde Arquitetural

Este documento é o blueprint que toda feature de domínio futura deve replicar.
Leia antes de criar qualquer módulo novo. O CustomerModule é o exemplo canônico.

---

## 1. Estrutura de módulo NestJS

Cada domínio vive em `apps/backend/src/{dominio}/` com quatro arquivos:

```
src/customer/
  customer.module.ts      # Declara controller e service
  customer.controller.ts  # HTTP: rotas, guards, pipes
  customer.service.ts     # Lógica: queries Prisma com company_id
```

**customer.module.ts** (exemplo canônico):
```typescript
@Module({
  controllers: [CustomerController],
  providers: [CustomerService],
})
export class CustomerModule {}
```

`PrismaModule` e `RedisModule` são `@Global()` — não precisam ser importados em cada módulo de domínio.

**Registro no AppModule:**
```typescript
// apps/backend/src/app.module.ts
imports: [
  PrismaModule,   // @Global — injetado automaticamente
  RedisModule,    // @Global — injetado automaticamente
  CustomerModule, // registrar aqui
]
```

---

## 2. TenantGuard e tenant scope

**Regra absoluta:** toda query de negócio filtra por `company_id`. Sem exceção.

### Guards no controller

```typescript
@Controller('customers')
@UseGuards(JwtAuthGuard, TenantGuard)
export class CustomerController {
  @Get()
  findAll(@Req() req: { companyId: string }, ...) {
    return this.customerService.findAll(req.companyId, ...);
  }
}
```

Ordem obrigatória: `JwtAuthGuard` primeiro (popula `req.user`), `TenantGuard` segundo (popula `req.companyId`).

### Como o TenantGuard funciona

1. Extrai `userId` de `req.user` (preenchido pelo JwtAuthGuard)
2. Verifica cache Redis (`tenant:{userId}`, TTL 60s)
3. Se miss: busca `CompanyMember.company_id` no Postgres
4. Salva no Redis e em `req.companyId`

JWT só identifica o usuário. Autorização (qual empresa) é revalidada a cada request via Redis.

### Queries com tenant scope

```typescript
// CORRETO: sempre filtrar por company_id
async findAll(companyId: string) {
  return this.prisma.customer.findMany({
    where: { company_id: companyId },
  });
}

// CORRETO: findFirst com ambos id + company_id
async findOne(id: string, companyId: string) {
  const customer = await this.prisma.customer.findFirst({
    where: { id, company_id: companyId },
  });
  if (!customer) throw new NotFoundException(); // 404, não 403
}
```

**Retornar 404 (não 403) em acesso cross-tenant** — não revelar que o recurso existe para outro tenant.

---

## 3. DTOs Zod em shared-types

Os schemas Zod vivem em `packages/shared-types/src/` e são compartilhados entre backend, mobile e web.

### Estrutura do DTO

```typescript
// packages/shared-types/src/customer/customer-create.dto.ts
import { z } from 'zod';

export const CustomerCreateSchema = z.object({
  name: z.string().min(2).max(120),
  phone: z.string().regex(/^\d{10,11}$/),
  customer_type: z.enum(['INDIVIDUAL', 'COMPANY']),
  // ...
});

export type CustomerCreateDto = z.infer<typeof CustomerCreateSchema>;
```

### Regras de shared-types

- **Nunca importar** `@prisma/client`, `@nestjs/*`, `react`, `react-native`
- Exportar schema (para validação) e tipo inferido (para tipagem)
- Barrel export em `src/index.ts`

### Uso no backend

```typescript
import { CustomerCreateSchema, CustomerCreateDto } from '@orcivo/shared-types';
import { ZodValidationPipe } from '../common/zod-validation.pipe';

@Post()
create(@Body(new ZodValidationPipe(CustomerCreateSchema)) body: unknown) {
  return this.customerService.create(body as CustomerCreateDto, req.companyId);
}
```

---

## 4. Consumo da API: mobile e web

### Mobile (React Native + Expo)

```typescript
// apps/mobile/src/services/api.ts
const api = axios.create({ baseURL: process.env.EXPO_PUBLIC_API_URL });

api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  config.headers['X-Client-Request-Id'] = generateRequestId(); // idempotência
  return config;
});
```

Tokens armazenados em `SecureStore` (não AsyncStorage).
Header `X-Client-Request-Id` obrigatório em mutations (POST, PATCH, DELETE).

### Web (Next.js)

```typescript
// apps/web/lib/api.ts
export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    credentials: 'include', // cookies httpOnly via API routes Next.js
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
```

Auth cookie gerenciado via `app/api/auth/` routes (Next.js route handlers) para evitar exposição de tokens ao JavaScript do browser.

---

## 5. Teste de isolamento multi-tenant em CI

O padrão de teste de isolamento cria dois tenants reais e verifica que não há vazamento.

### Estrutura do teste

```typescript
// src/{dominio}/{dominio}.isolation.spec.ts
describe('{Domínio} — Multi-tenant isolation (TENANT-02)', () => {
  let app: INestApplication;
  let tokenA: string;  // token do Tenant A
  let tokenB: string;  // token do Tenant B

  beforeAll(async () => {
    app = await getTestApp();
    // Criar Tenant A: signup/user → signup/company → login
    // Criar Tenant B: signup/user → signup/company → login
    // Criar recurso pertencente ao Tenant B
  });

  afterAll(async () => {
    await cleanupDatabase();
    await app.close();
  });

  it('Tenant A não lista recursos do Tenant B', async () => {
    const res = await request(app.getHttpServer())
      .get('/{dominio}')
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);
    expect(res.body.data).toEqual([]);
  });

  it('GET /{dominio}/:idDeB como Tenant A retorna 404', async () => {
    await request(app.getHttpServer())
      .get(`/{dominio}/${resourceBId}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(404);
  });
});
```

### CI: Postgres + Redis como services do GitHub Actions

```yaml
# .github/workflows/backend.yml
services:
  postgres:
    image: postgres:16-alpine
    env:
      POSTGRES_USER: orcivo
      POSTGRES_PASSWORD: orcivo
      POSTGRES_DB: orcivo_test
  redis:
    image: redis:7-alpine

env:
  DATABASE_URL_TEST: postgresql://orcivo:orcivo@localhost:5432/orcivo_test
  JWT_ACCESS_SECRET: ci-access-secret-test
  JWT_REFRESH_SECRET: ci-refresh-secret-test
  REDIS_HOST: localhost
  REDIS_PORT: 6379
```

O job executa `prisma db push --force-reset` antes dos testes para garantir schema atualizado no banco efêmero.

---

## 6. Como adicionar uma nova feature de domínio

Checklist replicável para cada nova entidade:

1. **Schema Prisma** — adicionar model com `company_id String` + `@@index([company_id])`
2. **DTO em shared-types** — schema Zod + tipo inferido; sem imports proibidos; exportar no barrel
3. **Módulo NestJS** — `{dominio}.module.ts`, `controller.ts`, `service.ts` em `src/{dominio}/`
4. **Guards no controller** — `@UseGuards(JwtAuthGuard, TenantGuard)` no class level
5. **Queries com tenant scope** — todo `findMany`/`findFirst`/`create` inclui `company_id`
6. **404 cross-tenant** — `findFirst({ where: { id, company_id } })` + `throw new NotFoundException()`
7. **Registrar no AppModule** — adicionar `{Dominio}Module` em `imports`
8. **Teste de isolamento** — criar `{dominio}.isolation.spec.ts` seguindo o padrão acima
9. **Prisma migrate** — rodar `prisma migrate dev --name add_{dominio}` (não `db push` em prod)

---

## Referências

- `apps/backend/src/customer/` — módulo canônico
- `apps/backend/src/auth/guards/tenant.guard.ts` — TenantGuard
- `packages/shared-types/src/customer/` — DTOs de referência
- `apps/backend/src/customer/customer.isolation.spec.ts` — teste de isolamento
- `docs/decisions/ADR-011-multi-tenant-company-id.md` — decisão de multi-tenant
- `docs/decisions/ADR-013-tenant-isolation-testing.md` — estratégia de teste em CI
