import { Controller, Get, Req } from '@nestjs/common';
import { DashboardService } from './dashboard.service';

// Tenant context set by the global TenantGuard — see ADR-014.
interface TenantRequest {
  companyId: string;
  user: { userId: string };
}

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  summary(@Req() req: TenantRequest) {
    return this.dashboardService.summary(req.companyId, req.user.userId);
  }
}
