import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { Prisma } from '@prisma/client';
import {
  LEGAL_DOCS_VERSION,
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
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import type { AccountUpdateDto } from './account-update.schema';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly redis: RedisService,
    private readonly mail: MailService,
    private readonly audit: AuditService,
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
        accepted_terms_version: dto.terms_version ?? LEGAL_DOCS_VERSION,
        accepted_privacy_version: dto.privacy_version ?? LEGAL_DOCS_VERSION,
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

    const tokens = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM users WHERE id = ${user.id} FOR UPDATE`;
      const current = await tx.user.findUniqueOrThrow({
        where: { id: user.id },
        select: { password_hash: true },
      });
      if (current.password_hash !== user.password_hash) {
        throw new UnauthorizedException('Credenciais inválidas');
      }
      return this.issueTokens(user.id, user.email, tx);
    });
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
    return this.prisma.$transaction(async (tx) => {
      // Serialize rotation with reset/logout. A refresh read before revocation
      // must not issue a successor after revocation has committed.
      await tx.$queryRaw`SELECT id FROM users WHERE id = ${userId} FOR UPDATE`;
      const stored = await tx.refreshToken.findFirst({
        where: { user_id: userId, token_hash: this.hashToken(rawRefreshToken), revoked: false },
      });
      if (!stored || stored.expires_at < new Date()) throw new UnauthorizedException();
      const claimed = await tx.refreshToken.updateMany({
        where: { id: stored.id, revoked: false },
        data: { revoked: true },
      });
      if (claimed.count !== 1) throw new UnauthorizedException();
      const user = await tx.user.findUniqueOrThrow({
        where: { id: userId },
        select: { email: true },
      });
      return this.issueTokens(userId, user.email, tx, stored.session_id);
    });
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
    // Claim once, even when two reset requests arrive concurrently. If the DB
    // fails, the user requests a new link rather than reusing a consumed token.
    const userId = await this.redis.getdel(redisKey);
    if (!userId) throw new BadRequestException('Token inválido ou expirado');

    const hash = await argon2.hash(dto.new_password);
    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM users WHERE id = ${userId} FOR UPDATE`;
      await tx.user.update({ where: { id: userId }, data: { password_hash: hash } });
      await tx.refreshToken.updateMany({
        where: { user_id: userId, revoked: false },
        data: { revoked: true },
      });
    });
  }

  async logoutRefresh(userId: string, rawRefreshToken: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM users WHERE id = ${userId} FOR UPDATE`;
      const token = await tx.refreshToken.findFirst({
        where: { user_id: userId, token_hash: this.hashToken(rawRefreshToken) },
      });
      if (!token || token.expires_at < new Date()) return;
      // Include a just-rotated successor when refresh raced with logout.
      await tx.refreshToken.updateMany({
        where: { user_id: userId, session_id: token.session_id, revoked: false },
        data: { revoked: true },
      });
    });
  }

  async logout(userId: string) {
    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM users WHERE id = ${userId} FOR UPDATE`;
      await tx.refreshToken.updateMany({
        where: { user_id: userId, revoked: false },
        data: { revoked: true },
      });
    });
    await this.redis.del(`membership:${userId}`);
    await this.redis.del(`tenant:${userId}`);
  }

  async getAccount(userId: string) {
    return this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { id: true, name: true, email: true },
    });
  }

  async updateAccount(companyId: string, userId: string, dto: AccountUpdateDto) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { id: true, name: true, email: true, password_hash: true },
    });

    const changingCredentials = dto.email !== undefined || dto.new_password !== undefined;
    if (changingCredentials) {
      const passwordMatches = await argon2.verify(user.password_hash, dto.current_password!);
      if (!passwordMatches) throw new UnauthorizedException('Senha atual incorreta');
    }

    if (dto.email !== undefined && dto.email !== user.email) {
      const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
      if (existing) throw new ConflictException('E-mail já cadastrado');
    }

    const data: { name?: string; email?: string; password_hash?: string } = {};
    const changedFields: string[] = [];
    if (dto.name !== undefined && dto.name !== user.name) {
      data.name = dto.name;
      changedFields.push('nome');
    }
    if (dto.email !== undefined && dto.email !== user.email) {
      data.email = dto.email;
      changedFields.push('e-mail');
    }
    if (dto.new_password !== undefined) {
      data.password_hash = await argon2.hash(dto.new_password);
      changedFields.push('senha');
    }

    if (changedFields.length === 0) {
      return { account: { id: user.id, name: user.name, email: user.email } };
    }

    const passwordChanged = dto.new_password !== undefined;
    const account = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id: userId },
        data,
        select: { id: true, name: true, email: true },
      });

      if (passwordChanged) {
        await tx.refreshToken.updateMany({
          where: { user_id: userId, revoked: false },
          data: { revoked: true },
        });
      }

      await this.audit.record(tx, {
        companyId,
        actorType: 'USER',
        actorUserId: userId,
        action: passwordChanged ? 'account.password_changed' : 'account.updated',
        entityType: 'user',
        entityId: userId,
        from: { fields: changedFields },
        to: { fields: changedFields },
        humanText: `Dados da conta atualizados (${changedFields.join(', ')})`,
      });
      return updated;
    });

    if (!passwordChanged) return { account };

    // A fresh pair keeps the initiating session active. All pre-existing
    // refresh tokens were revoked in the transaction above.
    const tokens = await this.issueTokens(userId, account.email);
    return { account, ...tokens };
  }

  private async issueTokens(
    userId: string,
    email: string,
    tx: Prisma.TransactionClient = this.prisma,
    sessionId: string = crypto.randomUUID(),
  ) {
    const access_token = this.signAccess(userId, email);
    const refresh_token = this.signRefresh(userId, email);
    const tokenHash = this.hashToken(refresh_token);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await tx.refreshToken.create({
      data: {
        user_id: userId,
        session_id: sessionId,
        token_hash: tokenHash,
        expires_at: expiresAt,
      },
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
