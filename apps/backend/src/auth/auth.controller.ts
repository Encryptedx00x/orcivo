import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import {
  ForgotPasswordDto,
  ForgotPasswordSchema,
  LoginSchema,
  ResetPasswordDto,
  ResetPasswordSchema,
  SignupStep1Schema,
  SignupStep2Schema,
  SelectCompanySchema,
  SwitchCompanySchema,
} from '@orcivo/shared-types';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { AuthService } from './auth.service';
import { AccountUpdateSchema } from './account-update.schema';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RefreshTokenGuard } from './guards/refresh-token.guard';
import { AllowPastDue } from '../billing/allow-past-due.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @UseGuards(ThrottlerGuard)
  @Post('signup/user')
  signupUser(@Body(new ZodValidationPipe(SignupStep1Schema)) body: unknown) {
    return this.authService.signupUser(body as never);
  }

  @Public()
  @UseGuards(ThrottlerGuard)
  @Post('signup/company')
  signupCompany(
    @Headers('authorization') auth: string | undefined,
    @Body(new ZodValidationPipe(SignupStep2Schema)) body: unknown,
  ) {
    const userId = this.authService.verifySignupToken(auth);
    return this.authService.signupCompany(userId, body as never);
  }

  @Public()
  @UseGuards(ThrottlerGuard)
  @HttpCode(200)
  @Post('login')
  login(@Body(new ZodValidationPipe(LoginSchema)) body: unknown) {
    return this.authService.login(body as never);
  }

  @Public()
  @UseGuards(ThrottlerGuard)
  @HttpCode(200)
  @Post('select-company')
  selectCompany(@Body(new ZodValidationPipe(SelectCompanySchema)) body: unknown) {
    const dto = body as { selection_token: string; company_id: string };
    return this.authService.selectCompany(dto.selection_token, dto.company_id);
  }

  @Public()
  @UseGuards(ThrottlerGuard, RefreshTokenGuard)
  @HttpCode(200)
  @Post('refresh')
  refresh(
    @Req()
    req: {
      user: {
        userId: string;
        refreshToken: string;
        sessionId?: string;
        companyId?: string;
        sessionVersion?: number;
      };
    },
  ) {
    return this.authService.refresh(req.user.userId, req.user.refreshToken, req.user);
  }

  @Public()
  @UseGuards(ThrottlerGuard)
  @HttpCode(200)
  @Post('forgot-password')
  forgotPassword(@Body(new ZodValidationPipe(ForgotPasswordSchema)) body: unknown) {
    return this.authService.forgotPassword(body as ForgotPasswordDto);
  }

  @Public()
  @UseGuards(ThrottlerGuard)
  @HttpCode(200)
  @Post('reset-password')
  resetPassword(@Body(new ZodValidationPipe(ResetPasswordSchema)) body: unknown) {
    return this.authService.resetPassword(body as ResetPasswordDto);
  }

  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  @Post('logout')
  logout(@CurrentUser() user: { userId: string; sessionId: string }) {
    return this.authService.logout(user.userId, user.sessionId);
  }

  @UseGuards(JwtAuthGuard, ThrottlerGuard)
  @AllowPastDue()
  @HttpCode(200)
  @Post('switch-company')
  switchCompany(
    @CurrentUser()
    user: { userId: string; email: string; sessionId: string; companyId: string },
    @Body(new ZodValidationPipe(SwitchCompanySchema)) body: unknown,
  ) {
    const dto = body as { company_id: string; refresh_token: string };
    return this.authService.switchCompany(user, dto.company_id, dto.refresh_token);
  }

  @Public()
  @UseGuards(ThrottlerGuard, RefreshTokenGuard)
  @HttpCode(200)
  @Post('logout/refresh')
  logoutRefresh(@Req() req: { user: { userId: string; refreshToken: string } }) {
    return this.authService.logoutRefresh(req.user.userId, req.user.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Get('account')
  getAccount(@CurrentUser() user: { userId: string }) {
    return this.authService.getAccount(user.userId);
  }

  @UseGuards(JwtAuthGuard, ThrottlerGuard)
  @Patch('account')
  updateAccount(
    @Req() req: { companyId: string },
    @CurrentUser() user: { userId: string },
    @Body(new ZodValidationPipe(AccountUpdateSchema)) body: unknown,
  ) {
    return this.authService.updateAccount(req.companyId, user.userId, body as never);
  }
}
