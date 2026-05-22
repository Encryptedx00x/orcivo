import {
  Body,
  Controller,
  HttpCode,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import {
  LoginSchema,
  SignupStep1Schema,
  SignupStep2Schema,
} from '@orcivo/shared-types';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RefreshTokenGuard } from './guards/refresh-token.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('signup/user')
  signupUser(@Body(new ZodValidationPipe(SignupStep1Schema)) body: unknown) {
    return this.authService.signupUser(body as never);
  }

  @UseGuards(JwtAuthGuard)
  @Post('signup/company')
  signupCompany(
    @CurrentUser() user: { userId: string },
    @Body(new ZodValidationPipe(SignupStep2Schema)) body: unknown,
  ) {
    return this.authService.signupCompany(user.userId, body as never);
  }

  @Public()
  @UseGuards(ThrottlerGuard)
  @HttpCode(200)
  @Post('login')
  login(@Body(new ZodValidationPipe(LoginSchema)) body: unknown) {
    return this.authService.login(body as never);
  }

  @Public()
  @UseGuards(RefreshTokenGuard)
  @HttpCode(200)
  @Post('refresh')
  refresh(@Req() req: { user: { userId: string; refreshToken: string } }) {
    return this.authService.refresh(req.user.userId, req.user.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  @Post('logout')
  logout(@CurrentUser() user: { userId: string }) {
    return this.authService.logout(user.userId);
  }
}
