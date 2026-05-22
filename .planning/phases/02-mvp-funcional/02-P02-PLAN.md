---
phase: "2A"
plan: "02-P02"
title: "Backend infra — StorageService (MinIO) + MailService (Resend/Console) + PlanLimitsService"
wave: 2
depends_on: ["02-P01"]
files_modified:
  - apps/backend/src/storage/storage.module.ts
  - apps/backend/src/storage/storage.service.ts
  - apps/backend/src/mail/mail.module.ts
  - apps/backend/src/mail/mail.service.ts
  - apps/backend/src/mail/console-mail.service.ts
  - apps/backend/src/plan-limits/plan-limits.module.ts
  - apps/backend/src/plan-limits/plan-limits.service.ts
  - apps/backend/src/plan-limits/check-plan-limit.decorator.ts
  - apps/backend/src/plan-limits/check-plan-limit.guard.ts
  - apps/backend/src/app.module.ts
  - apps/backend/.env.example
autonomous: true
requirements: ["D2.3", "D2.5"]

must_haves:
  truths:
    - "StorageService.uploadBuffer sobe arquivo ao MinIO e retorna URL pública"
    - "StorageService.onModuleInit cria buckets orcivo-pdfs e orcivo-photos se não existirem"
    - "MailService usa ConsoleMailService quando MAIL_PROVIDER=console (dev sem Resend)"
    - "PlanLimitsService.check retorna allowed:true para todas features exceto PDF_WATERMARK"
    - "PDF_WATERMARK retorna allowed:false para empresa com plan_code=LIVRE"
    - "@CheckPlanLimit decorator aplicável em controllers"
  artifacts:
    - path: "apps/backend/src/storage/storage.service.ts"
      provides: "uploadBuffer, deleteObject, onModuleInit com bucket creation"
      exports: ["StorageService"]
    - path: "apps/backend/src/mail/mail.service.ts"
      provides: "Interface MailService com método send"
      exports: ["MailService"]
    - path: "apps/backend/src/plan-limits/plan-limits.service.ts"
      provides: "PlanLimitsService.check(companyId, feature)"
      exports: ["PlanLimitsService"]
  key_links:
    - from: "apps/backend/src/app.module.ts"
      to: "StorageModule, MailModule, PlanLimitsModule"
      via: "imports array"
      pattern: "StorageModule|MailModule|PlanLimitsModule"
---

<objective>
Criar os três serviços de infraestrutura global que os módulos de domínio consumirão: StorageService (MinIO), MailService (Resend + console fallback), e PlanLimitsService scaffold.

Purpose: Esses serviços são `@Global()` e injetados automaticamente. Os módulos CatalogModule/QuoteModule/WorkOrderModule dependem de StorageService e PlanLimitsService. O MailService é usado pelo AuthModule no P03.
Output: Três módulos @Global() com services prontos; app.module.ts atualizado; .env.example com as novas vars.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@docs/ARCHITECTURE-MOLD.md
@.planning/phases/02-mvp-funcional/02-RESEARCH.md

<interfaces>
<!-- PrismaModule e RedisModule já são @Global() — não reimportar -->
<!-- PrismaService injetável via constructor sem importar PrismaModule -->
<!-- RedisService injetável via constructor sem importar RedisModule -->

<!-- Padrão de módulo @Global() existente no projeto: -->
<!-- apps/backend/src/prisma/prisma.module.ts tem @Global() + @Module({ exports: [PrismaService] }) -->

<!-- Variáveis env a adicionar em .env.example: -->
<!-- MINIO_ENDPOINT=localhost -->
<!-- MINIO_PORT=9000 -->
<!-- MINIO_USE_SSL=false -->
<!-- MINIO_ACCESS_KEY=minioadmin -->
<!-- MINIO_SECRET_KEY=minioadmin -->
<!-- MINIO_PUBLIC_URL=http://localhost:9000 -->
<!-- MAIL_PROVIDER=console (dev) | resend (prod) -->
<!-- RESEND_API_KEY=re_xxx -->
<!-- RESEND_FROM=noreply@orcivo.com.br -->

<!-- Pattern 2 de RESEARCH.md contém código de StorageService completo -->
<!-- Pattern 9 de RESEARCH.md contém código de PlanLimitsService completo -->
<!-- Pattern 8 de RESEARCH.md contém contexto do MailService -->
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: StorageService (MinIO) + MailService (Resend/Console)</name>
  <files>
    apps/backend/src/storage/storage.module.ts,
    apps/backend/src/storage/storage.service.ts,
    apps/backend/src/mail/mail.module.ts,
    apps/backend/src/mail/mail.service.ts,
    apps/backend/src/mail/console-mail.service.ts
  </files>
  <read_first>
    - apps/backend/src/prisma/prisma.module.ts (padrão de módulo @Global() a replicar)
    - .planning/phases/02-mvp-funcional/02-RESEARCH.md §"Pattern 2: Upload para MinIO" (código StorageService)
    - .planning/phases/02-mvp-funcional/02-RESEARCH.md §"Pitfall 4: MinIO sem bucket pré-criado"
    - apps/backend/package.json (verificar se minio e resend já estão instalados)
  </read_first>
  <action>
Instalar dependências se não presentes:
```bash
pnpm --filter @orcivo/backend add minio@8.0.7 resend@6.12.3
```

**apps/backend/src/storage/storage.service.ts:**
```typescript
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from 'minio';

const BUCKETS = ['orcivo-pdfs', 'orcivo-photos'] as const;

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly client: Client;
  private readonly logger = new Logger(StorageService.name);

  constructor(private readonly config: ConfigService) {
    this.client = new Client({
      endPoint: config.getOrThrow('MINIO_ENDPOINT'),
      port: parseInt(config.get('MINIO_PORT', '9000')),
      useSSL: config.get('MINIO_USE_SSL', 'false') === 'true',
      accessKey: config.getOrThrow('MINIO_ACCESS_KEY'),
      secretKey: config.getOrThrow('MINIO_SECRET_KEY'),
    });
  }

  async onModuleInit() {
    for (const bucket of BUCKETS) {
      const exists = await this.client.bucketExists(bucket);
      if (!exists) {
        await this.client.makeBucket(bucket);
        // Política de leitura pública para URLs servidas diretamente
        const policy = JSON.stringify({
          Version: '2012-10-17',
          Statement: [{ Effect: 'Allow', Principal: '*', Action: ['s3:GetObject'], Resource: [`arn:aws:s3:::${bucket}/*`] }],
        });
        await this.client.setBucketPolicy(bucket, policy);
        this.logger.log(`Bucket criado: ${bucket}`);
      }
    }
  }

  async uploadBuffer(bucket: string, objectName: string, buffer: Buffer, contentType: string): Promise<string> {
    await this.client.putObject(bucket, objectName, buffer, buffer.length, { 'Content-Type': contentType });
    return `${this.config.getOrThrow('MINIO_PUBLIC_URL')}/${bucket}/${objectName}`;
  }

  async deleteObject(bucket: string, objectName: string): Promise<void> {
    await this.client.removeObject(bucket, objectName);
  }
}
```

**apps/backend/src/storage/storage.module.ts:**
```typescript
import { Global, Module } from '@nestjs/common';
import { StorageService } from './storage.service';

@Global()
@Module({ providers: [StorageService], exports: [StorageService] })
export class StorageModule {}
```

**apps/backend/src/mail/mail.service.ts** (interface abstrata):
```typescript
export interface MailMessage {
  to: string;
  subject: string;
  html: string;
}

export abstract class MailService {
  abstract send(message: MailMessage): Promise<void>;
}
```

**apps/backend/src/mail/console-mail.service.ts** (fallback dev):
```typescript
import { Injectable, Logger } from '@nestjs/common';
import { MailMessage, MailService } from './mail.service';

@Injectable()
export class ConsoleMailService extends MailService {
  private readonly logger = new Logger('MailService[console]');

  async send(message: MailMessage): Promise<void> {
    this.logger.log(`[DEV EMAIL] To: ${message.to} | Subject: ${message.subject}`);
    this.logger.log(`[DEV EMAIL] Body: ${message.html}`);
  }
}
```

**apps/backend/src/mail/resend-mail.service.ts** (produção):
```typescript
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { MailMessage, MailService } from './mail.service';

@Injectable()
export class ResendMailService extends MailService {
  private readonly resend: Resend;
  private readonly from: string;
  private readonly logger = new Logger('MailService[resend]');

  constructor(private readonly config: ConfigService) {
    super();
    this.resend = new Resend(config.getOrThrow('RESEND_API_KEY'));
    this.from = config.get('RESEND_FROM', 'noreply@orcivo.com.br');
  }

  async send(message: MailMessage): Promise<void> {
    const { error } = await this.resend.emails.send({ from: this.from, ...message });
    if (error) {
      this.logger.error(`Falha ao enviar e-mail: ${error.message}`);
      throw new Error(error.message);
    }
  }
}
```

**apps/backend/src/mail/mail.module.ts:**
```typescript
import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ConsoleMailService } from './console-mail.service';
import { MailService } from './mail.service';
import { ResendMailService } from './resend-mail.service';

@Global()
@Module({
  providers: [
    {
      provide: MailService,
      useFactory: (config: ConfigService) => {
        const provider = config.get('MAIL_PROVIDER', 'console');
        return provider === 'resend' ? new ResendMailService(config) : new ConsoleMailService();
      },
      inject: [ConfigService],
    },
  ],
  exports: [MailService],
})
export class MailModule {}
```
  </action>
  <verify>
    <automated>cd /c/Users/Encryptedx/Desktop/orcivo && pnpm --filter @orcivo/backend build 2>&1 | grep -E "error|Error" | head -20 || echo "BUILD OK"</automated>
  </verify>
  <done>
    - StorageService, MailService, ConsoleMailService, ResendMailService compilam sem erros TypeScript
    - StorageModule e MailModule são @Global() com exports corretos
    - MailModule usa ConsoleMailService quando MAIL_PROVIDER=console (padrão)
  </done>
</task>

<task type="auto">
  <name>Task 2: PlanLimitsService scaffold + registrar módulos no AppModule</name>
  <files>
    apps/backend/src/plan-limits/plan-limits.module.ts,
    apps/backend/src/plan-limits/plan-limits.service.ts,
    apps/backend/src/plan-limits/check-plan-limit.decorator.ts,
    apps/backend/src/plan-limits/check-plan-limit.guard.ts,
    apps/backend/src/app.module.ts,
    apps/backend/.env.example
  </files>
  <read_first>
    - apps/backend/src/app.module.ts (ler antes de modificar — adicionar módulos sem remover existentes)
    - apps/backend/.env.example (ler antes de modificar)
    - .planning/phases/02-mvp-funcional/02-RESEARCH.md §"Pattern 9: PlanLimitsService scaffold"
  </read_first>
  <action>
**apps/backend/src/plan-limits/plan-limits.service.ts** (baseado em Pattern 9 do RESEARCH.md):
```typescript
import { Injectable } from '@nestjs/common';
import { PlanFeature } from '@orcivo/shared-types';
import { PrismaService } from '../prisma/prisma.service';

export interface PlanCheckResult {
  allowed: boolean;
  limit?: number;
  reason?: string;
}

@Injectable()
export class PlanLimitsService {
  constructor(private readonly prisma: PrismaService) {}

  async check(companyId: string, feature: PlanFeature): Promise<PlanCheckResult> {
    // Fase 2: todos permitidos — exceto marca d'água para LIVRE
    // Fase 3 plugará enforcement real com billing Asaas
    if (feature === PlanFeature.PDF_WATERMARK) {
      const company = await this.prisma.company.findUniqueOrThrow({ where: { id: companyId } });
      const allowed = company.plan_code !== 'LIVRE';
      return { allowed, reason: allowed ? undefined : 'Orcivo Livre inclui marca d\'água no PDF' };
    }
    return { allowed: true };
  }
}
```

**apps/backend/src/plan-limits/check-plan-limit.decorator.ts:**
```typescript
import { SetMetadata } from '@nestjs/common';
import { PlanFeature } from '@orcivo/shared-types';

export const PLAN_LIMIT_KEY = 'plan_limit_feature';
export const CheckPlanLimit = (feature: PlanFeature) => SetMetadata(PLAN_LIMIT_KEY, feature);
```

**apps/backend/src/plan-limits/check-plan-limit.guard.ts:**
```typescript
import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PLAN_LIMIT_KEY } from './check-plan-limit.decorator';
import { PlanLimitsService } from './plan-limits.service';

@Injectable()
export class CheckPlanLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly planLimits: PlanLimitsService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const feature = this.reflector.getAllAndOverride(PLAN_LIMIT_KEY, [ctx.getHandler(), ctx.getClass()]);
    if (!feature) return true;
    const req = ctx.switchToHttp().getRequest();
    const companyId: string = req.companyId;
    if (!companyId) return true; // guard sem tenant context não bloqueia
    const result = await this.planLimits.check(companyId, feature);
    if (!result.allowed) throw new ForbiddenException(result.reason ?? 'Limite do plano atingido');
    return true;
  }
}
```

**apps/backend/src/plan-limits/plan-limits.module.ts:**
```typescript
import { Global, Module } from '@nestjs/common';
import { CheckPlanLimitGuard } from './check-plan-limit.guard';
import { PlanLimitsService } from './plan-limits.service';

@Global()
@Module({
  providers: [PlanLimitsService, CheckPlanLimitGuard],
  exports: [PlanLimitsService, CheckPlanLimitGuard],
})
export class PlanLimitsModule {}
```

**apps/backend/src/app.module.ts** — adicionar imports (NÃO remover existentes):
Adicionar ao array `imports`: `StorageModule`, `MailModule`, `PlanLimitsModule`
Adicionar imports no topo: `import { StorageModule } from './storage/storage.module'`, etc.

**apps/backend/.env.example** — adicionar seção:
```
# MinIO (Storage)
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_PUBLIC_URL=http://localhost:9000

# Mail
MAIL_PROVIDER=console
RESEND_API_KEY=re_xxx
RESEND_FROM=noreply@orcivo.com.br

# App URLs (para links em e-mails)
APP_WEB_URL=http://localhost:3000
```
  </action>
  <verify>
    <automated>cd /c/Users/Encryptedx/Desktop/orcivo && pnpm --filter @orcivo/backend build 2>&1 | grep -E "^.*error TS" | head -20 || echo "BUILD OK"</automated>
  </verify>
  <done>
    - `pnpm --filter @orcivo/backend build` sem erros
    - StorageModule, MailModule, PlanLimitsModule aparecem no app.module.ts imports
    - PlanLimitsService.check retorna { allowed: false } para PDF_WATERMARK + plano LIVRE
    - CheckPlanLimit decorator e CheckPlanLimitGuard exportados do módulo
    - .env.example contém as novas variáveis de ambiente
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| backend → MinIO | Upload de arquivos com credenciais do MinIO; sem exposição de credenciais ao cliente |
| backend → Resend | API key em variável de ambiente; nunca no código fonte |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-2A-02 | Information Disclosure | StorageService bucket policy | mitigate | Buckets têm política de apenas GetObject público — ListBucket e PutObject requerem credenciais |
| T-2A-03 | Tampering | uploadBuffer contentType | mitigate | Módulos consumidores validam content-type antes de chamar uploadBuffer (validação em WorkOrderController no P06) |
| T-2A-04 | Information Disclosure | MAIL_PROVIDER=console em prod | mitigate | .env.example documenta MAIL_PROVIDER=resend para produção; ConsoleMailService nunca envia dados externos |
| T-2A-05 | Elevation of Privilege | CheckPlanLimitGuard sem companyId | accept | Guard retorna true quando companyId não disponível — TenantGuard (que vem antes) já garante companyId em rotas protegidas |
</threat_model>

<verification>
```bash
cd /c/Users/Encryptedx/Desktop/orcivo
pnpm --filter @orcivo/backend build
grep -n "StorageModule\|MailModule\|PlanLimitsModule" apps/backend/src/app.module.ts
grep -n "MINIO_ENDPOINT\|MAIL_PROVIDER" apps/backend/.env.example
```
</verification>

<success_criteria>
- Backend compila sem erros após adicionar os 3 módulos
- StorageService.onModuleInit (testável com MinIO rodando no Docker)
- MailModule usa ConsoleMailService quando MAIL_PROVIDER=console
- PlanLimitsService.check('any-id', PlanFeature.PDF_WATERMARK) consulta banco e retorna allowed baseado em plan_code
- .env.example documentado com todas as novas vars
</success_criteria>

<output>
Após conclusão, criar `.planning/phases/02-mvp-funcional/2A-P02-SUMMARY.md`
</output>
