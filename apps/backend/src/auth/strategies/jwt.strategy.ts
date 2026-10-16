import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import type { MemberRole } from '@prisma/client';

interface JwtPayload {
  sub: string;
  email: string;
  sid?: string;
  cid?: string;
  sv?: number;
  iat?: number;
  exp?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
    });
  }

  async validate(payload: JwtPayload) {
    if (!payload.sid || !payload.cid || payload.sv === undefined) {
      throw new UnauthorizedException();
    }
    const sessionKey = `session:${payload.sid}`;
    const membershipKey = `membership:${payload.sub}:${payload.cid}`;
    const [cachedSession, cachedMembership] = await Promise.all([
      this.redis.get(sessionKey),
      this.redis.get(membershipKey),
    ]);

    if (cachedSession && cachedMembership) {
      try {
        const session = JSON.parse(cachedSession) as {
          userId: string;
          companyId: string;
          version: number;
        };
        const membership = JSON.parse(cachedMembership) as { role: MemberRole };
        if (
          session.userId === payload.sub &&
          session.companyId === payload.cid &&
          session.version === payload.sv &&
          membership.role
        ) {
          return {
            userId: payload.sub,
            email: payload.email,
            sessionId: payload.sid,
            companyId: payload.cid,
            role: membership.role,
          };
        }
      } catch {
        // Invalid cache entries are ignored and replaced from the database.
      }
    }

    const [session, membership] = await Promise.all([
      this.prisma.authSession.findUnique({ where: { id: payload.sid } }),
      this.prisma.companyMember.findUnique({
        where: { company_id_user_id: { company_id: payload.cid, user_id: payload.sub } },
        select: { active: true, role: true },
      }),
    ]);

    if (
      !session ||
      session.revoked_at ||
      session.user_id !== payload.sub ||
      session.active_company_id !== payload.cid ||
      session.version !== payload.sv ||
      !membership?.active
    ) {
      throw new UnauthorizedException();
    }

    await Promise.all([
      this.redis.setex(
        sessionKey,
        60,
        JSON.stringify({
          userId: session.user_id,
          companyId: session.active_company_id,
          version: session.version,
        }),
      ),
      this.redis.setex(membershipKey, 60, JSON.stringify({ role: membership.role })),
    ]);
    return {
      userId: payload.sub,
      email: payload.email,
      sessionId: payload.sid,
      companyId: payload.cid,
      role: membership.role,
    };
  }
}
