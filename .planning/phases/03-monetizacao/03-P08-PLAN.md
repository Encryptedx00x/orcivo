# 03-P08 — Convites de membros (InviteModule)

## Goal
Permitir que o owner da empresa convide outros usuários (técnicos) por e-mail, respeitando o limite de membros do plano.

## Wave
4 (depende de 03-P04 para enforço de limite MEMBERS)

## Context
- `CompanyMember` já existe no schema com roles (OWNER, MEMBER, VIEWER)
- Limite de membros por plano: LIVRE=1, SOLO=1, MAIS=3, EQUIPE=10
- Fluxo: owner convida → e-mail enviado com link → convidado aceita → CompanyMember criado
- MailService já existe (ConsoleMailService para dev)

## Tasks

### T1 — Schema: modelo Invite

Adicionar ao `prisma/schema.prisma`:

```prisma
enum InviteStatus {
  PENDING
  ACCEPTED
  EXPIRED
  REVOKED
}

model CompanyInvite {
  id         String        @id @default(uuid())
  company_id String
  company    Company       @relation(fields: [company_id], references: [id])
  email      String
  role       MemberRole    @default(MEMBER)
  token      String        @unique @default(uuid())
  status     InviteStatus  @default(PENDING)
  invited_by String        // user_id do owner
  expires_at DateTime
  accepted_at DateTime?
  created_at DateTime      @default(now())
  updated_at DateTime      @updatedAt

  @@index([token])
  @@map("company_invites")
}
```

Adicionar relação na Company: `invites CompanyInvite[]`

### T2 — DTOs no shared-types

Criar `packages/shared-types/src/invite/invite.dto.ts`:

```typescript
import { z } from 'zod';

export const CreateInviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(['MEMBER', 'VIEWER']).default('MEMBER'),
});
export type CreateInviteDto = z.infer<typeof CreateInviteSchema>;

export const AcceptInviteSchema = z.object({
  token: z.string().uuid(),
  // Se o convidado não tem conta, precisa criar senha
  name: z.string().min(2).optional(),
  password: z.string().min(8).optional(),
});
export type AcceptInviteDto = z.infer<typeof AcceptInviteSchema>;
```

Exportar de `packages/shared-types/src/index.ts`.

### T3 — InviteService

Criar `apps/backend/src/invite/invite.service.ts`:

```typescript
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { PlanLimitsService } from '../plan-limits/plan-limits.service';

@Injectable()
export class InviteService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly limits: PlanLimitsService,
  ) {}

  async create(companyId: string, invitedBy: string, email: string, role: 'MEMBER' | 'VIEWER') {
    // Verificar limite de membros
    await this.limits.enforceLimit(companyId, 'MEMBERS');

    // Verificar se e-mail já é membro
    const existing = await this.prisma.companyMember.findFirst({
      where: { company_id: companyId, user: { email } },
    });
    if (existing) throw new BadRequestException('Este e-mail já é membro da empresa.');

    // Verificar convite pendente
    const pendingInvite = await this.prisma.companyInvite.findFirst({
      where: { company_id: companyId, email, status: 'PENDING' },
    });
    if (pendingInvite) throw new BadRequestException('Já existe um convite pendente para este e-mail.');

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 dias
    const invite = await this.prisma.companyInvite.create({
      data: { company_id: companyId, email, role, invited_by: invitedBy, expires_at: expiresAt },
      include: { company: true },
    });

    // Enviar e-mail com link de convite
    const inviteUrl = `${process.env['APP_URL'] ?? 'https://app.orcivo.com.br'}/convite/${invite.token}`;
    await this.mail.sendInvite({
      to: email,
      companyName: invite.company.trade_name,
      inviteUrl,
    });

    return invite;
  }

  async accept(token: string, userId?: string, name?: string, password?: string) {
    const invite = await this.prisma.companyInvite.findUnique({
      where: { token },
      include: { company: true },
    });

    if (!invite) throw new NotFoundException('Convite não encontrado.');
    if (invite.status !== 'PENDING') throw new BadRequestException('Convite já foi usado ou expirou.');
    if (invite.expires_at < new Date()) {
      await this.prisma.companyInvite.update({ where: { id: invite.id }, data: { status: 'EXPIRED' } });
      throw new BadRequestException('Convite expirado.');
    }

    // Se usuário não autenticado, criar conta
    let targetUserId = userId;
    if (!targetUserId) {
      if (!name || !password) throw new BadRequestException('Nome e senha são obrigatórios para criar conta.');
      const bcrypt = await import('bcrypt');
      const hash = await bcrypt.hash(password, 10);
      const newUser = await this.prisma.user.create({
        data: { name, email: invite.email, password_hash: hash },
      });
      targetUserId = newUser.id;
    }

    // Criar membro e marcar convite como aceito
    await this.prisma.$transaction([
      this.prisma.companyMember.create({
        data: { company_id: invite.company_id, user_id: targetUserId, role: invite.role },
      }),
      this.prisma.companyInvite.update({
        where: { id: invite.id },
        data: { status: 'ACCEPTED', accepted_at: new Date() },
      }),
    ]);

    return { company: invite.company };
  }

  async list(companyId: string) {
    return this.prisma.companyInvite.findMany({
      where: { company_id: companyId, status: 'PENDING' },
      orderBy: { created_at: 'desc' },
    });
  }

  async revoke(companyId: string, inviteId: string) {
    const invite = await this.prisma.companyInvite.findFirst({ where: { id: inviteId, company_id: companyId } });
    if (!invite) throw new NotFoundException('Convite não encontrado.');
    return this.prisma.companyInvite.update({ where: { id: inviteId }, data: { status: 'REVOKED' } });
  }
}
```

### T4 — InviteController

Criar `apps/backend/src/invite/invite.controller.ts`:

```typescript
import { Controller, Post, Get, Delete, Param, Body, Req } from '@nestjs/common';
import { InviteService } from './invite.service';
import { TenantRequest } from '../common/interfaces/tenant-request.interface';
import { Public } from '../auth/decorators/public.decorator';

@Controller('invites')
export class InviteController {
  constructor(private readonly inviteService: InviteService) {}

  @Post()
  create(@Req() req: TenantRequest, @Body() body: { email: string; role?: 'MEMBER' | 'VIEWER' }) {
    return this.inviteService.create(req.companyId, req.user.userId, body.email, body.role ?? 'MEMBER');
  }

  @Get()
  list(@Req() req: TenantRequest) {
    return this.inviteService.list(req.companyId);
  }

  @Delete(':id')
  revoke(@Req() req: TenantRequest, @Param('id') id: string) {
    return this.inviteService.revoke(req.companyId, id);
  }

  @Public()
  @Post('accept')
  accept(@Body() body: { token: string; name?: string; password?: string }, @Req() req: any) {
    const userId = req.user?.userId; // pode ser undefined se não logado
    return this.inviteService.accept(body.token, userId, body.name, body.password);
  }
}
```

### T5 — InviteModule

Criar `apps/backend/src/invite/invite.module.ts` e registrar em `app.module.ts`.

### T6 — MailService: adicionar método sendInvite

Em `apps/backend/src/mail/mail.service.ts`, adicionar:

```typescript
async sendInvite(data: { to: string; companyName: string; inviteUrl: string }): Promise<void> {
  // ConsoleMailService: apenas logar
  console.log(`[Mail] Convite para ${data.to}: ${data.inviteUrl}`);
}
```

### T7 — Web: página /convite/[token]

Criar `apps/web/app/convite/[token]/page.tsx` — formulário para aceitar convite.

### T8 — Web: página de membros /equipe

Criar `apps/web/app/(app)/equipe/page.tsx`:
- Listar membros atuais (GET /company/members)
- Botão "Convidar" → modal com e-mail
- Listar convites pendentes com opção de revogar
- Proteger com verificação de role OWNER

## Verification

```bash
# TypeCheck
cd apps/backend && npx tsc --noEmit

# InviteModule registrado
grep "InviteModule" apps/backend/src/app.module.ts

# Página de convite existe
ls apps/web/app/convite/

# Sem hardcode de limite de membros
grep -r "members_max.*[0-9]\|limit.*[0-9].*member" apps/backend/src/invite/ && echo "HARDCODED - FALHOU" || echo "OK"
```

## Notes
- O link de convite usa `APP_URL` env var — placeholder `https://app.orcivo.com.br`
- `sendInvite` no ConsoleMailService apenas loga — implementação Resend fica para Fase 6
- Aceitar convite sem conta cria usuário novo — edge case que pode ser melhorado na Fase 4
