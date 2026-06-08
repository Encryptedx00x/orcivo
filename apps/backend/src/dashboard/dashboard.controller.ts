import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { DashboardService } from './dashboard.service';

interface TenantRequest {
  companyId: string;
  user: { userId: string };
}

@Controller('dashboard')
@UseGuards(JwtAuthGuard, TenantGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  summary(@Req() req: TenantRequest) {
    return this.dashboardService.summary(req.companyId, req.user.userId);
  }
}
