import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { AuthService } from './auth.service';

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  refreshToken: {
    updateMany: jest.fn(),
  },
};

const mockRedis = {
  set: jest.fn(),
  get: jest.fn(),
  del: jest.fn(),
};

const mockMail = {
  send: jest.fn(),
};

const mockJwt = {
  sign: jest.fn().mockReturnValue('mock-token'),
};

const mockConfig = {
  get: jest.fn().mockReturnValue('http://localhost:3000'),
  getOrThrow: jest.fn().mockReturnValue('secret'),
};

describe('AuthService — forgotPassword / resetPassword', () => {
  let service: AuthService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
        { provide: MailService, useValue: mockMail },
        { provide: JwtService, useValue: mockJwt },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('forgotPassword', () => {
    it('Test 1: e-mail inexistente — retorna void sem lançar exceção', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.forgotPassword({ email: 'naoexiste@exemplo.com' }),
      ).resolves.toBeUndefined();

      expect(mockRedis.set).not.toHaveBeenCalled();
      expect(mockMail.send).not.toHaveBeenCalled();
    });

    it('Test 2: e-mail existente — armazena token no Redis com TTL 900 e envia e-mail', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-123', email: 'user@exemplo.com' });
      mockRedis.set.mockResolvedValue('OK');
      mockMail.send.mockResolvedValue(undefined);

      await service.forgotPassword({ email: 'user@exemplo.com' });

      expect(mockRedis.set).toHaveBeenCalledWith(
        expect.stringMatching(/^pwd:reset:[0-9a-f-]{36}$/),
        'user-123',
        'EX',
        900,
      );
      expect(mockMail.send).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@exemplo.com',
          subject: 'Redefinir senha — Orcivo',
        }),
      );
    });
  });

  describe('resetPassword', () => {
    it('Test 3: token válido — atualiza password_hash e chama redis.del', async () => {
      mockRedis.get.mockResolvedValue('user-123');
      mockPrisma.user.update.mockResolvedValue({});
      mockRedis.del.mockResolvedValue(1);

      await service.resetPassword({ token: 'valid-uuid-token', new_password: 'NovaSenha123' });

      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'user-123' } }),
      );
      expect(mockRedis.del).toHaveBeenCalledWith('pwd:reset:valid-uuid-token');
    });

    it('Test 4: token inválido (redis retorna null) — lança BadRequestException', async () => {
      mockRedis.get.mockResolvedValue(null);

      await expect(
        service.resetPassword({ token: 'invalid-token', new_password: 'SenhaQualquer1' }),
      ).rejects.toThrow(BadRequestException);

      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });
  });
});
