import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { CompanyService } from './company.service';

interface TenantRequest {
  companyId: string;
}

@Controller('company')
@UseGuards(JwtAuthGuard, TenantGuard)
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  @Get('me')
  getMe(@Req() req: TenantRequest) {
    return this.companyService.findCurrent(req.companyId);
  }

  @Patch('approval-methods')
  updateApprovalMethods(
    @Req() req: TenantRequest,
    @Body() body: { methods: ('APPROVE_BUTTON' | 'TYPED_NAME' | 'DRAWN_SIGNATURE')[] },
  ) {
    return this.companyService.updateApprovalMethods(req.companyId, body.methods);
  }
}
