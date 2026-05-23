import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { MailModule } from '../mail/mail.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtSignupStrategy } from './strategies/jwt-signup.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { RefreshTokenStrategy } from './strategies/refresh-token.strategy';

@Module({
  imports: [PassportModule, JwtModule.register({}), ConfigModule, MailModule],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, JwtSignupStrategy, RefreshTokenStrategy],
  exports: [AuthService],
})
export class AuthModule {}
