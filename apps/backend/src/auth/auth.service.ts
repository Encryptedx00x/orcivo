import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  ForgotPasswordDto,
  ResetPasswordDto,
  SignupStep1Dto,
  SignupStep2Dto,
  LoginDto,
  LoginResponseDto,
} from '@orcivo/shared-types';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly redis: RedisService,
    private readonly mail: MailService,
  ) {}

  async signupUser(dto: SignupStep1Dto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('E-mail já cadastrado');

    const password_hash = await argon2.hash(dto.password);
    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        password_hash,
        accepted_terms_at: new Date(),
      },
      select: { id: true, name: true, email: true },
    });

    const access_token = this.signAccess(user.id, user.email);
    return { user, access_token };
  }

  verifySignupToken(bearer: string | undefined): string {
    if (!bearer) throw new UnauthorizedException();
    const token = bearer.startsWith('Bearer ') ? bearer.slice(7) : bearer;
    try {
      const payload = this.jwt.verify<{ sub: string }>(token, {
        secret: this.config.getOrThrow('JWT_ACCESS_SECRET'),
      });
      return payload.sub;
    } catch {
      throw new UnauthorizedException();
    }
  }

  async signupCompany(userId: string, dto: SignupStep2Dto): Promise<LoginResponseDto> {
    // Idempotent: a double-submit must not create a second company/membership.
    const already = await this.prisma.companyMember.findFirst({
      where: { user_id: userId, active: true },
      include: { company: { select: { id: true, trade_name: true } } },
    });
    if (already) {
      const u = await this.prisma.user.findUniqueOrThrow({
        where: { id: userId },
        select: { id: true, name: true, email: true },
      });
      const t = await this.issueTokens(userId, u.email);
      return {
        access_token: t.access_token,
        refresh_token: t.refresh_token,
        user: u,
        company: already.company,
      };
    }

    const [company] = await this.prisma.$transaction([
      this.prisma.company.create({
        data: {
          trade_name: dto.trade_name,
          document_type: dto.document_type as never,
          document: dto.document,
          phone: dto.phone,
          city: dto.city,
          state: dto.state,
          brand_color: dto.brand_color,
          pix_key: dto.pix_key,
          plan_code: 'LIVRE',
          members: {
            create: { user_id: userId, role: 'OWNER', active: true },
          },
        },
      }),
    ]);

    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { id: true, name: true, email: true },
    });

    const tokens = await this.issueTokens(userId, user.email);
    return {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      user,
      company: { id: company.id, trade_name: company.trade_name },
    };
  }

  async login(dto: LoginDto): Promise<LoginResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      select: { id: true, name: true, email: true, password_hash: true },
    });

    const valid = user && (await argon2.verify(user.password_hash, dto.password));
    if (!valid) throw new UnauthorizedException('Credenciais inválidas');

    const membership = await this.prisma.companyMember.findFirst({
      where: { user_id: user.id, active: true },
      include: { company: { select: { id: true, trade_name: true } } },
    });

    if (!membership) throw new UnauthorizedException('Sem empresa associada');

    const tokens = await this.issueTokens(user.id, user.email);
    return {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      user: { id: user.id, name: user.name, email: user.email },
      company: membership.company,
    };
  }

  async refresh(
    userId: string,
    rawRefreshToken: string,
  ): Promise<{ access_token: string; refresh_token: string }> {
    const tokenHash = this.hashToken(rawRefreshToken);
    const stored = await this.prisma.refreshToken.findFirst({
      where: { user_id: userId, token_hash: tokenHash, revoked: false },
    });
    if (!stored || stored.expires_at < new Date()) throw new UnauthorizedException();

    await this.prisma.refreshToken.update({ where: { id: stored.id }, data: { revoked: true } });

    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { email: true },
    });
    return this.issueTokens(userId, user.email);
  }

  async forgotPassword(dto: ForgotPasswordDto): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    // Sempre retorna void — não revelar se e-mail existe (ASVS V2)
    if (!user) return;

    const token = crypto.randomUUID();
    await this.redis.setex(`pwd:reset:${token}`, 900, user.id); // 15 min

    const baseUrl = this.config.get('APP_WEB_URL', 'http://localhost:3000');
    const resetUrl = `${baseUrl}/reset-password?token=${token}`;
    await this.mail.send({
      to: dto.email,
      subject: 'Redefinir senha — Orcivo',
      html: `<p>Clique no link para redefinir sua senha (válido por 15 minutos):</p><p><a href="${resetUrl}">${resetUrl}</a></p>`,
    });
  }

  async resetPassword(dto: ResetPasswordDto): Promise<void> {
    const redisKey = `pwd:reset:${dto.token}`;
    const userId = await this.redis.get(redisKey);
    if (!userId) throw new BadRequestException('Token inválido ou expirado');

    const hash = await argon2.hash(dto.new_password);
    await this.prisma.user.update({ where: { id: userId }, data: { password_hash: hash } });
    await this.redis.del(redisKey); // invalidar token após uso único
  }

  async logout(userId: string) {
    await this.prisma.refreshToken.updateMany({
      where: { user_id: userId, revoked: false },
      data: { revoked: true },
    });
    await this.redis.del(`membership:${userId}`);
    await this.redis.del(`tenant:${userId}`);
  }

  private async issueTokens(userId: string, email: string) {
    const access_token = this.signAccess(userId, email);
    const refresh_token = this.signRefresh(userId, email);
    const tokenHash = this.hashToken(refresh_token);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await this.prisma.refreshToken.create({
      data: { user_id: userId, token_hash: tokenHash, expires_at: expiresAt },
    });
    return { access_token, refresh_token };
  }

  private signAccess(userId: string, email: string) {
    return this.jwt.sign(
      { sub: userId, email },
      { secret: this.config.getOrThrow('JWT_ACCESS_SECRET'), expiresIn: '15m' },
    );
  }

  private signRefresh(userId: string, email: string) {
    // jti guarantees each refresh token (and thus its hash) is unique even when
    // two are issued for the same user in the same second.
    return this.jwt.sign(
      { sub: userId, email, jti: crypto.randomUUID() },
      { secret: this.config.getOrThrow('JWT_REFRESH_SECRET'), expiresIn: '30d' },
    );
  }

  private hashToken(token: string) {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}
