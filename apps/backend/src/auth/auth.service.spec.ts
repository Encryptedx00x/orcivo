import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { AuthService } from './auth.service';
import { AuditService } from '../audit/audit.service';
import * as argon2 from 'argon2';

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    findUniqueOrThrow: jest.fn(),
    update: jest.fn(),
  },
  refreshToken: {
    updateMany: jest.fn(),
    create: jest.fn(),
  },
  $transaction: jest.fn(),
};

const mockTransaction = {
  user: { update: jest.fn() },
  refreshToken: { updateMany: jest.fn() },
};

const mockRedis = {
  setex: jest.fn(),
  get: jest.fn(),
  del: jest.fn(),
};

const mockMail = {
  send: jest.fn(),
};

const mockAudit = { record: jest.fn() };

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
    mockPrisma.$transaction.mockImplementation(
      async (callback: (tx: typeof mockTransaction) => unknown) => callback(mockTransaction),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
        { provide: MailService, useValue: mockMail },
        { provide: JwtService, useValue: mockJwt },
        { provide: ConfigService, useValue: mockConfig },
        { provide: AuditService, useValue: mockAudit },
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

      expect(mockRedis.setex).not.toHaveBeenCalled();
      expect(mockMail.send).not.toHaveBeenCalled();
    });

    it('Test 2: e-mail existente — armazena token no Redis com TTL 900 e envia e-mail', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-123', email: 'user@exemplo.com' });
      mockRedis.setex.mockResolvedValue('OK');
      mockMail.send.mockResolvedValue(undefined);

      await service.forgotPassword({ email: 'user@exemplo.com' });

      expect(mockRedis.setex).toHaveBeenCalledWith(
        expect.stringMatching(/^pwd:reset:[0-9a-f-]{36}$/),
        900,
        'user-123',
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

  describe('updateAccount', () => {
    it('updates only the display name and writes an audit row without asking for the password', async () => {
      mockPrisma.user.findUniqueOrThrow.mockResolvedValue({
        id: 'user-123',
        name: 'Nome antigo',
        email: 'user@exemplo.com',
        password_hash: 'hash',
      });
      mockTransaction.user.update.mockResolvedValue({
        id: 'user-123',
        name: 'Nome novo',
        email: 'user@exemplo.com',
      });

      await expect(
        service.updateAccount('company-123', 'user-123', { name: 'Nome novo' }),
      ).resolves.toEqual({
        account: { id: 'user-123', name: 'Nome novo', email: 'user@exemplo.com' },
      });

      expect(mockTransaction.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-123' },
          data: { name: 'Nome novo' },
        }),
      );
      expect(mockTransaction.refreshToken.updateMany).not.toHaveBeenCalled();
      expect(mockAudit.record).toHaveBeenCalledWith(
        mockTransaction,
        expect.objectContaining({
          companyId: 'company-123',
          actorUserId: 'user-123',
          action: 'account.updated',
          entityType: 'user',
        }),
      );
    });

    it('rejects an e-mail change when the current password is incorrect', async () => {
      const passwordHash = await argon2.hash('SenhaAtual123');
      mockPrisma.user.findUniqueOrThrow.mockResolvedValue({
        id: 'user-123',
        name: 'Nome',
        email: 'user@exemplo.com',
        password_hash: passwordHash,
      });

      await expect(
        service.updateAccount('company-123', 'user-123', {
          email: 'novo@exemplo.com',
          current_password: 'senha-incorreta',
        }),
      ).rejects.toThrow(UnauthorizedException);

      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it('rejects an e-mail that belongs to another user after validating the current password', async () => {
      const passwordHash = await argon2.hash('SenhaAtual123');
      mockPrisma.user.findUniqueOrThrow.mockResolvedValue({
        id: 'user-123',
        name: 'Nome',
        email: 'user@exemplo.com',
        password_hash: passwordHash,
      });
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'other-user' });

      await expect(
        service.updateAccount('company-123', 'user-123', {
          email: 'ocupado@exemplo.com',
          current_password: 'SenhaAtual123',
        }),
      ).rejects.toThrow('E-mail já cadastrado');

      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it('revokes every active refresh token, records the audit, and issues replacement tokens for a password change', async () => {
      const passwordHash = await argon2.hash('SenhaAtual123');
      mockPrisma.user.findUniqueOrThrow.mockResolvedValue({
        id: 'user-123',
        name: 'Nome',
        email: 'user@exemplo.com',
        password_hash: passwordHash,
      });
      mockTransaction.user.update.mockResolvedValue({
        id: 'user-123',
        name: 'Nome',
        email: 'user@exemplo.com',
      });
      mockPrisma.refreshToken.create.mockResolvedValue({ id: 'new-session' });

      const result = await service.updateAccount('company-123', 'user-123', {
        current_password: 'SenhaAtual123',
        new_password: 'SenhaNova456',
      });

      expect(mockTransaction.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { user_id: 'user-123', revoked: false },
        data: { revoked: true },
      });
      expect(mockAudit.record).toHaveBeenCalledWith(
        mockTransaction,
        expect.objectContaining({
          action: 'account.password_changed',
        }),
      );
      expect(mockPrisma.refreshToken.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ user_id: 'user-123' }),
        }),
      );
      expect(result).toEqual(
        expect.objectContaining({
          account: { id: 'user-123', name: 'Nome', email: 'user@exemplo.com' },
          access_token: 'mock-token',
          refresh_token: 'mock-token',
        }),
      );
    });
  });
});
