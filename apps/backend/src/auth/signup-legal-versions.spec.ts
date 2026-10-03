import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { LEGAL_DOCS_VERSION } from '@orcivo/shared-types';
import { AuditService } from '../audit/audit.service';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { AuthService } from './auth.service';

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
};

describe('AuthService.signupUser — versão dos termos aceitos', () => {
  let service: AuthService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.user.create.mockResolvedValue({ id: 'u1', name: 'João', email: 'joao@exemplo.com' });

    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: {} },
        { provide: MailService, useValue: {} },
        { provide: JwtService, useValue: { sign: jest.fn().mockReturnValue('tok') } },
        { provide: ConfigService, useValue: { get: jest.fn(), getOrThrow: jest.fn().mockReturnValue('s') } },
        { provide: AuditService, useValue: {} },
      ],
    }).compile();
    service = module.get(AuthService);
  });

  const base = { name: 'João', email: 'joao@exemplo.com', password: 'senha1234', accepted_terms: true as const };

  it('cliente antigo (mobile sem versão) grava a versão vigente e a data do aceite', async () => {
    await service.signupUser(base);
    const data = mockPrisma.user.create.mock.calls[0][0].data;
    expect(data.accepted_terms_version).toBe(LEGAL_DOCS_VERSION);
    expect(data.accepted_privacy_version).toBe(LEGAL_DOCS_VERSION);
    expect(data.accepted_terms_at).toBeInstanceOf(Date);
  });

  it('cliente novo (web/mobile) grava a versão enviada', async () => {
    await service.signupUser({
      ...base,
      terms_version: LEGAL_DOCS_VERSION,
      privacy_version: LEGAL_DOCS_VERSION,
    });
    const data = mockPrisma.user.create.mock.calls[0][0].data;
    expect(data.accepted_terms_version).toBe(LEGAL_DOCS_VERSION);
    expect(data.accepted_privacy_version).toBe(LEGAL_DOCS_VERSION);
  });
});
