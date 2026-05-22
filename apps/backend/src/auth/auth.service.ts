import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { SignupStep1Dto, SignupStep2Dto, LoginDto, LoginResponseDto } from '@orcivo/shared-types';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly redis: RedisService,
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

  async signupCompany(userId: string, dto: SignupStep2Dto): Promise<LoginResponseDto> {
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
      user: { id: user.id, name: user.name, email: user.email },
      company: membership.company,
    };
  }

  async refresh(userId: string, rawRefreshToken: string): Promise<{ access_token: string; refresh_token: string }> {
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
    return this.jwt.sign(
      { sub: userId, email },
      { secret: this.config.getOrThrow('JWT_REFRESH_SECRET'), expiresIn: '30d' },
    );
  }

  private hashToken(token: string) {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}
