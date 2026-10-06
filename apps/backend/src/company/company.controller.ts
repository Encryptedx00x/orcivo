import {
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  Put,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApprovalMethodsSchema, CompanyProfileUpdateSchema } from './company-profile-update.schema';
import { CompanyService } from './company.service';
import { PlanLimitsService } from '../plan-limits/plan-limits.service';
import { SubscriptionService } from '../billing/subscription.service';
import { AllowPastDue } from '../billing/allow-past-due.decorator';
import { AdminOnly } from '../auth/decorators/roles.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';

// Tenant context set by the global TenantGuard — see ADR-014.
interface TenantRequest {
  companyId: string;
  user: { userId: string };
}

@Controller('company')
export class CompanyController {
  constructor(
    private readonly companyService: CompanyService,
    private readonly planLimitsService: PlanLimitsService,
    private readonly subscriptionService: SubscriptionService,
  ) {}

  @Get('me')
  getMe(@Req() req: TenantRequest) {
    return this.companyService.findCurrent(req.companyId);
  }

  @AdminOnly()
  @Patch('me')
  updateMe(
    @Req() req: TenantRequest,
    @Body(new ZodValidationPipe(CompanyProfileUpdateSchema)) body: unknown,
  ) {
    return this.companyService.updateProfile(req.companyId, body as never, req.user.userId);
  }

  @AdminOnly()
  @Put('logo')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 2 * 1024 * 1024 } }))
  uploadLogo(@Req() req: TenantRequest, @UploadedFile() file: Express.Multer.File) {
    return this.companyService.uploadLogo(req.companyId, file, req.user.userId);
  }

  @AdminOnly()
  @Delete('logo')
  removeLogo(@Req() req: TenantRequest) {
    return this.companyService.removeLogo(req.companyId, req.user.userId);
  }

  @AdminOnly()
  @Get('members')
  getMembers(@Req() req: TenantRequest) {
    return this.companyService.getMembers(req.companyId);
  }

  @AdminOnly()
  @Patch('approval-methods')
  updateApprovalMethods(
    @Req() req: TenantRequest,
    @Body(new ZodValidationPipe(ApprovalMethodsSchema)) body: unknown,
  ) {
    const { methods } = body as {
      methods: ('APPROVE_BUTTON' | 'TYPED_NAME' | 'DRAWN_SIGNATURE' | 'PHOTO_SIGNATURE')[];
    };
    return this.companyService.updateApprovalMethods(req.companyId, methods, req.user.userId);
  }

  @Get('me/plan-limits')
  getPlanLimits(@Req() req: TenantRequest) {
    return this.planLimitsService.getLimits(req.companyId);
  }

  @Get('me/dashboard')
  getDashboard(@Req() req: TenantRequest) {
    return this.companyService.getDashboard(req.companyId);
  }

  @AllowPastDue()
  @Get('me/subscription-status')
  getSubscriptionStatus(@Req() req: TenantRequest) {
    return this.subscriptionService.getSubscriptionStatus(req.companyId);
  }
}
