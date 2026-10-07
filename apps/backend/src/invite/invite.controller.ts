import { Controller, Post, Get, Delete, Param, Body, Req, UseGuards } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { InviteService } from './invite.service';
import { TenantRequest } from '../common/interfaces/tenant-request.interface';
import { Public } from '../auth/decorators/public.decorator';
import { AdminOnly } from '../auth/decorators/roles.decorator';

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
    @Body() body: { token: string; name?: string; password?: string },
    @Req() req: { user?: { userId: string } },
  ) {
    const userId = req.user?.userId;
    return this.inviteService.accept(body.token, userId, body.name, body.password);
  }
}
