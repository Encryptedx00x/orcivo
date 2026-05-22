import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';

interface JwtPayload {
  sub: string;
  email: string;
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
    const cacheKey = `membership:${payload.sub}`;
    const cached = await this.redis.get(cacheKey);

    if (cached) {
      return { userId: payload.sub, email: payload.email };
    }

    const membership = await this.prisma.companyMember.findFirst({
      where: { user_id: payload.sub, active: true },
    });

    if (!membership) {
      throw new UnauthorizedException();
    }

    await this.redis.setex(cacheKey, 60, '1');
    return { userId: payload.sub, email: payload.email };
  }
}
