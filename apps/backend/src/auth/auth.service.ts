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
  LoginResultDto,
  CompanySelectionRequiredDto,
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
        salutation: dto.salutation ?? 'NONE',
        salutation_custom: dto.salutation === 'CUSTOM' ? dto.salutation_custom : null,
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

  async signupCompany(userId: string, dto: SignupStep2Dto): Promise<LoginResultDto> {
    // Idempotent: a double-submit must not create a second company/membership.
    const existingMemberships = await this.prisma.companyMember.findMany({
      where: { user_id: userId, active: true },
      include: { company: { select: { id: true, trade_name: true } } },
    });
    if (existingMemberships.length > 0) {
      const u = await this.prisma.user.findUniqueOrThrow({
        where: { id: userId },
        select: { id: true, name: true, email: true },
      });
      if (existingMemberships.length > 1) {
        return this.companySelectionRequired(u.id, u.email, existingMemberships);
      }
      const membership = existingMemberships[0]!;
      const t = await this.createSessionAndIssueTokens(userId, u.email, membership.company_id);
      return {
        access_token: t.access_token,
        refresh_token: t.refresh_token,
        user: u,
        company: membership.company,
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
          industry_code: dto.industry_code,
          industry_other: dto.industry_code === 'OTHER' ? dto.industry_other : null,
          onboarding_goals: dto.onboarding_goals ?? [],
          plan_code: 'LIVRE',
          members: {
            create: {
              user_id: userId,
              role: 'OWNER',
              active: true,
              profession_title: dto.profession_title,
            },
          },
        },
      }),
    ]);

    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { id: true, name: true, email: true },
    });

    const tokens = await this.createSessionAndIssueTokens(userId, user.email, company.id);
    return {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      user,
      company: { id: company.id, trade_name: company.trade_name },
    };
  }

  async login(dto: LoginDto): Promise<LoginResultDto> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      select: { id: true, name: true, email: true, password_hash: true },
    });

    const valid = user && (await argon2.verify(user.password_hash, dto.password));
    if (!valid) throw new UnauthorizedException('Credenciais inválidas');

    const memberships = await this.prisma.companyMember.findMany({
      where: { user_id: user.id, active: true },
      include: { company: { select: { id: true, trade_name: true } } },
      orderBy: { created_at: 'asc' },
    });

    if (memberships.length === 0) throw new UnauthorizedException('Sem empresa associada');
    if (memberships.length > 1) {
      return this.companySelectionRequired(user.id, user.email, memberships);
    }
    const membership = memberships[0]!;

    const tokens = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM users WHERE id = ${user.id} FOR UPDATE`;
      const current = await tx.user.findUniqueOrThrow({
        where: { id: user.id },
        select: { password_hash: true },
      });
      if (current.password_hash !== user.password_hash) {
        throw new UnauthorizedException('Credenciais inválidas');
      }
      return this.createSessionAndIssueTokens(user.id, user.email, membership.company_id, tx);
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
    claims?: { sessionId?: string; companyId?: string; sessionVersion?: number },
  ): Promise<{ access_token: string; refresh_token: string }> {
    return this.prisma.$transaction(async (tx) => {
      // Serialize rotation with reset/logout. A refresh read before revocation
      // must not issue a successor after revocation has committed.
      await tx.$queryRaw`SELECT id FROM users WHERE id = ${userId} FOR UPDATE`;
      const stored = await tx.refreshToken.findFirst({
        where: { user_id: userId, token_hash: this.hashToken(rawRefreshToken), revoked: false },
        include: { auth_session: true },
      });
      if (!stored || stored.expires_at < new Date()) throw new UnauthorizedException();
      let session = stored.auth_session;
      if (session) {
        if (
          session.revoked_at ||
          session.user_id !== userId ||
          claims?.sessionId !== session.id ||
          claims.companyId !== session.active_company_id ||
          claims.sessionVersion !== session.version
        ) {
          throw new UnauthorizedException();
        }
        const membership = await tx.companyMember.findUnique({
          where: {
            company_id_user_id: { company_id: session.active_company_id, user_id: userId },
          },
          select: { active: true },
        });
        if (!membership?.active) throw new UnauthorizedException();
      } else {
        const memberships = await tx.companyMember.findMany({
          where: { user_id: userId, active: true },
          select: { company_id: true },
        });
        if (memberships.length !== 1) {
          throw new UnauthorizedException('Selecione a empresa novamente.');
        }
        session = await tx.authSession.create({
          data: { user_id: userId, active_company_id: memberships[0]!.company_id },
        });
      }
      const claimed = await tx.refreshToken.updateMany({
        where: { id: stored.id, revoked: false },
        data: { revoked: true },
      });
      if (claimed.count !== 1) throw new UnauthorizedException();
      const user = await tx.user.findUniqueOrThrow({
        where: { id: userId },
        select: { email: true },
      });
      return this.issueTokens(userId, user.email, session, tx, stored.session_id);
    });
  }

  async selectCompany(selectionToken: string, companyId: string): Promise<LoginResponseDto> {
    const payload = this.verifySelectionToken(selectionToken);
    const membership = await this.prisma.companyMember.findUnique({
      where: { company_id_user_id: { company_id: companyId, user_id: payload.sub } },
      include: { company: { select: { id: true, trade_name: true } } },
    });
    if (!membership?.active)
      throw new UnauthorizedException('Empresa indisponível para esta conta.');
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: payload.sub },
      select: { id: true, name: true, email: true },
    });
    const tokens = await this.createSessionAndIssueTokens(user.id, user.email, companyId);
    return { ...tokens, user, company: membership.company };
  }

  async switchCompany(
    user: { userId: string; email: string; sessionId: string; companyId: string },
    companyId: string,
    rawRefreshToken: string,
  ): Promise<LoginResponseDto> {
    const result = await this.prisma.$transaction(async (tx) => {
      const target = await tx.companyMember.findUnique({
        where: { company_id_user_id: { company_id: companyId, user_id: user.userId } },
        include: { company: { select: { id: true, trade_name: true } } },
      });
      if (!target?.active) throw new UnauthorizedException('Empresa indisponível para esta conta.');

      const current = await tx.authSession.findUnique({ where: { id: user.sessionId } });
      const stored = await tx.refreshToken.findFirst({
        where: {
          user_id: user.userId,
          auth_session_id: user.sessionId,
          token_hash: this.hashToken(rawRefreshToken),
          revoked: false,
        },
      });
      if (
        !current ||
        current.revoked_at ||
        current.active_company_id !== user.companyId ||
        !stored
      ) {
        throw new UnauthorizedException();
      }

      await tx.authSession.update({
        where: { id: current.id },
        data: { revoked_at: new Date(), version: { increment: 1 } },
      });
      await tx.refreshToken.updateMany({
        where: { auth_session_id: current.id, revoked: false },
        data: { revoked: true },
      });
      const tokens = await this.createSessionAndIssueTokens(user.userId, user.email, companyId, tx);
      await this.audit.record(tx, {
        companyId,
        actorType: 'USER',
        actorUserId: user.userId,
        action: 'auth.company_switched',
        entityType: 'auth_session',
        entityId: user.sessionId,
        from: { company_id: user.companyId },
        to: { company_id: companyId },
        humanText: `Empresa ativa alterada para "${target.company.trade_name}"`,
      });
      const account = await tx.user.findUniqueOrThrow({
        where: { id: user.userId },
        select: { id: true, name: true, email: true },
      });
      return { ...tokens, user: account, company: target.company };
    });
    await this.redis.del(`session:${user.sessionId}`);
    return result;
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
    const revokedSessionIds = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM users WHERE id = ${userId} FOR UPDATE`;
      const sessions = await tx.authSession.findMany({
        where: { user_id: userId, revoked_at: null },
        select: { id: true },
      });
      await tx.user.update({ where: { id: userId }, data: { password_hash: hash } });
      await tx.refreshToken.updateMany({
        where: { user_id: userId, revoked: false },
        data: { revoked: true },
      });
      await tx.authSession.updateMany({
        where: { user_id: userId, revoked_at: null },
        data: { revoked_at: new Date(), version: { increment: 1 } },
      });
      return sessions.map((session) => session.id);
    });
    await Promise.all(revokedSessionIds.map((sessionId) => this.redis.del(`session:${sessionId}`)));
  }

  async logoutRefresh(userId: string, rawRefreshToken: string): Promise<void> {
    const sessionId = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM users WHERE id = ${userId} FOR UPDATE`;
      const token = await tx.refreshToken.findFirst({
        where: { user_id: userId, token_hash: this.hashToken(rawRefreshToken) },
      });
      if (!token || token.expires_at < new Date()) return null;
      // Include a just-rotated successor when refresh raced with logout.
      await tx.refreshToken.updateMany({
        where: { user_id: userId, session_id: token.session_id, revoked: false },
        data: { revoked: true },
      });
      if (token.auth_session_id) {
        await tx.authSession.updateMany({
          where: { id: token.auth_session_id, user_id: userId, revoked_at: null },
          data: { revoked_at: new Date(), version: { increment: 1 } },
        });
      }
      return token.auth_session_id;
    });
    if (sessionId) await this.redis.del(`session:${sessionId}`);
  }

  async logout(userId: string, sessionId: string) {
    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM users WHERE id = ${userId} FOR UPDATE`;
      await tx.refreshToken.updateMany({
        where: { user_id: userId, auth_session_id: sessionId, revoked: false },
        data: { revoked: true },
      });
      await tx.authSession.updateMany({
        where: { id: sessionId, user_id: userId, revoked_at: null },
        data: { revoked_at: new Date(), version: { increment: 1 } },
      });
    });
    await this.redis.del(`session:${sessionId}`);
  }

  async getAccount(userId: string) {
    return this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { id: true, name: true, email: true, salutation: true, salutation_custom: true },
    });
  }

  async updateAccount(companyId: string, userId: string, dto: AccountUpdateDto) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        salutation: true,
        salutation_custom: true,
        password_hash: true,
      },
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

    const data: {
      name?: string;
      email?: string;
      password_hash?: string;
      salutation?: string;
      salutation_custom?: string | null;
    } = {};
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
    if (dto.salutation !== undefined && dto.salutation !== user.salutation) {
      data.salutation = dto.salutation;
      data.salutation_custom = dto.salutation === 'CUSTOM' ? (dto.salutation_custom ?? null) : null;
      changedFields.push('tratamento');
    } else if (
      dto.salutation === 'CUSTOM' &&
      dto.salutation_custom !== undefined &&
      dto.salutation_custom !== user.salutation_custom
    ) {
      data.salutation_custom = dto.salutation_custom;
      changedFields.push('tratamento');
    }

    if (changedFields.length === 0) {
      return {
        account: {
          id: user.id,
          name: user.name,
          email: user.email,
          salutation: user.salutation,
          salutation_custom: user.salutation_custom,
        },
      };
    }

    const passwordChanged = dto.new_password !== undefined;
    const { account, revokedSessionIds } = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id: userId },
        data,
        select: { id: true, name: true, email: true, salutation: true, salutation_custom: true },
      });

      let sessionIds: string[] = [];
      if (passwordChanged) {
        const sessions = await tx.authSession.findMany({
          where: { user_id: userId, revoked_at: null },
          select: { id: true },
        });
        sessionIds = sessions.map((session) => session.id);
        await tx.refreshToken.updateMany({
          where: { user_id: userId, revoked: false },
          data: { revoked: true },
        });
        await tx.authSession.updateMany({
          where: { user_id: userId, revoked_at: null },
          data: { revoked_at: new Date(), version: { increment: 1 } },
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
      return { account: updated, revokedSessionIds: sessionIds };
    });

    if (!passwordChanged) return { account };

    await Promise.all(revokedSessionIds.map((sessionId) => this.redis.del(`session:${sessionId}`)));

    // A fresh pair keeps the initiating session active. All pre-existing
    // refresh tokens were revoked in the transaction above.
    const tokens = await this.createSessionAndIssueTokens(userId, account.email, companyId);
    return { account, ...tokens };
  }

  private async createSessionAndIssueTokens(
    userId: string,
    email: string,
    companyId: string,
    tx: Prisma.TransactionClient = this.prisma,
  ) {
    const session = await tx.authSession.create({
      data: { user_id: userId, active_company_id: companyId },
    });
    return this.issueTokens(userId, email, session, tx);
  }

  private async issueTokens(
    userId: string,
    email: string,
    session: { id: string; active_company_id: string; version: number },
    tx: Prisma.TransactionClient = this.prisma,
    sessionId: string = crypto.randomUUID(),
  ) {
    const access_token = this.signAccess(
      userId,
      email,
      session.id,
      session.active_company_id,
      session.version,
    );
    const refresh_token = this.signRefresh(
      userId,
      email,
      session.id,
      session.active_company_id,
      session.version,
    );
    const tokenHash = this.hashToken(refresh_token);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await tx.refreshToken.create({
      data: {
        user_id: userId,
        session_id: sessionId,
        auth_session_id: session.id,
        token_hash: tokenHash,
        expires_at: expiresAt,
      },
    });
    return { access_token, refresh_token };
  }

  private signAccess(
    userId: string,
    email: string,
    sessionId?: string,
    companyId?: string,
    sessionVersion?: number,
  ) {
    return this.jwt.sign(
      {
        sub: userId,
        email,
        ...(sessionId ? { sid: sessionId } : {}),
        ...(companyId ? { cid: companyId } : {}),
        ...(sessionVersion !== undefined ? { sv: sessionVersion } : {}),
      },
      { secret: this.config.getOrThrow('JWT_ACCESS_SECRET'), expiresIn: '15m' },
    );
  }

  private signRefresh(
    userId: string,
    email: string,
    sessionId: string,
    companyId: string,
    sessionVersion: number,
  ) {
    // jti guarantees each refresh token (and thus its hash) is unique even when
    // two are issued for the same user in the same second.
    return this.jwt.sign(
      {
        sub: userId,
        email,
        sid: sessionId,
        cid: companyId,
        sv: sessionVersion,
        jti: crypto.randomUUID(),
      },
      { secret: this.config.getOrThrow('JWT_REFRESH_SECRET'), expiresIn: '30d' },
    );
  }

  private hashToken(token: string) {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private companySelectionRequired(
    userId: string,
    email: string,
    memberships: Array<{
      company_id: string;
      role: 'OWNER' | 'ADMIN' | 'TECNICO';
      company: { trade_name: string };
    }>,
  ): CompanySelectionRequiredDto {
    const selection_token = this.jwt.sign(
      { sub: userId, email, purpose: 'company_selection' },
      { secret: this.config.getOrThrow('JWT_ACCESS_SECRET'), expiresIn: '5m' },
    );
    return {
      requires_company_selection: true,
      selection_token,
      companies: memberships.map((membership) => ({
        company_id: membership.company_id,
        trade_name: membership.company.trade_name,
        role: membership.role,
      })),
    };
  }

  private verifySelectionToken(token: string): { sub: string; email: string } {
    try {
      const payload = this.jwt.verify<{ sub: string; email: string; purpose?: string }>(token, {
        secret: this.config.getOrThrow('JWT_ACCESS_SECRET'),
      });
      if (payload.purpose !== 'company_selection') throw new Error('invalid purpose');
      return payload;
    } catch {
      throw new UnauthorizedException('Seleção de empresa expirada. Entre novamente.');
    }
  }
}
