import { Controller, Post, Get, Delete, Param, Body, Req, UseGuards } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { InviteService } from './invite.service';
import { TenantRequest } from '../common/interfaces/tenant-request.interface';
import { Public } from '../auth/decorators/public.decorator';
import { AdminOnly } from '../auth/decorators/roles.decorator';
import { AllowPastDue } from '../billing/allow-past-due.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { AcceptExistingInviteSchema, AcceptInviteSchema } from '@orcivo/shared-types';

// Tenant context (companyId/role) set by the global TenantGuard — see ADR-014.
// Invite management is admin-only; accepting an invite is public (token-based).
@Controller('invites')
export class InviteController {
  constructor(private readonly inviteService: InviteService) {}

  @AdminOnly()
  @Post()
  create(@Req() req: TenantRequest, @Body() body: { email: string; role?: 'ADMIN' | 'TECNICO' }) {
    return this.inviteService.create(
      req.companyId,
      req.user.userId,
      body.email,
      body.role ?? 'TECNICO',
    );
  }

  @AdminOnly()
  @Get()
  list(@Req() req: TenantRequest) {
    return this.inviteService.list(req.companyId);
  }

  @AdminOnly()
  @Delete(':id')
  revoke(@Req() req: TenantRequest, @Param('id') id: string) {
    return this.inviteService.revoke(req.companyId, id, req.user.userId);
  }

  @Public()
  @UseGuards(ThrottlerGuard)
  @Post('accept')
  accept(
    @Body(new ZodValidationPipe(AcceptInviteSchema))
    body: {
      token: string;
      name?: string;
      password?: string;
    },
  ) {
    return this.inviteService.acceptNew(body.token, body.name, body.password);
  }

  @AllowPastDue()
  @Post('accept-existing')
  acceptExisting(
    @Body(new ZodValidationPipe(AcceptExistingInviteSchema)) body: { token: string },
    @Req() req: TenantRequest,
  ) {
    return this.inviteService.acceptExisting(body.token, req.user.userId);
  }
}
