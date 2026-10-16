import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { InviteService } from './invite.service';

describe('InviteService', () => {
  const tx = {
    user: { create: jest.fn() },
    companyMember: { create: jest.fn(), upsert: jest.fn(), findUnique: jest.fn() },
    companyInvite: { update: jest.fn(), updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
  };
  const prisma = {
    companyInvite: { findUnique: jest.fn(), update: jest.fn() },
    companyMember: { findUnique: jest.fn() },
    user: { findUnique: jest.fn() },
    $transaction: jest.fn(async (callback: (client: typeof tx) => Promise<unknown>) =>
      callback(tx),
    ),
  };
  const redis = { del: jest.fn() };
  const audit = { record: jest.fn() };
  const service = new InviteService(
    prisma as never,
    redis as never,
    {} as never,
    {} as never,
    audit as never,
  );

  const company = { id: 'company-1', trade_name: 'Empresa convidante' };
  const pendingInvite = {
    id: 'invite-1',
    company_id: company.id,
    email: 'convidado@example.invalid',
    role: 'TECNICO' as const,
    status: 'PENDING',
    expires_at: new Date(Date.now() + 60_000),
    company,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('distingue convite inexistente sem criar usuário ou vínculo', async () => {
    prisma.companyInvite.findUnique.mockResolvedValue(null);
    await expect(service.acceptNew('missing', 'Pessoa', 'senha-segura')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(tx.user.create).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('aceita convite público, cria usuário e vínculo na mesma transação', async () => {
    prisma.companyInvite.findUnique.mockResolvedValue(pendingInvite);
    prisma.user.findUnique.mockResolvedValue(null);
    tx.user.create.mockResolvedValue({ id: 'user-1' });
    await expect(
      service.acceptNew('invite-token', 'Pessoa Convidada', 'senha-segura'),
    ).resolves.toEqual({ company });
    expect(tx.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: 'Pessoa Convidada',
        email: 'convidado@example.invalid',
        password_hash: expect.any(String),
        accepted_terms_at: expect.any(Date),
      }),
    });
    expect(tx.companyMember.create).toHaveBeenCalledWith({
      data: { company_id: company.id, user_id: 'user-1', role: 'TECNICO' },
    });
    expect(redis.del).toHaveBeenCalledWith('membership:user-1:company-1');
  });

  it('orienta login quando o convite público pertence a uma conta existente', async () => {
    prisma.companyInvite.findUnique.mockResolvedValue(pendingInvite);
    prisma.user.findUnique.mockResolvedValue({ id: 'user-1' });
    await expect(
      service.acceptNew('invite-token', 'Pessoa', 'senha-segura'),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(tx.user.create).not.toHaveBeenCalled();
  });

  it('adiciona a empresa a usuário autenticado sem recadastrar a conta', async () => {
    prisma.companyInvite.findUnique.mockResolvedValue(pendingInvite);
    prisma.user.findUnique.mockResolvedValue({ email: pendingInvite.email });
    prisma.companyMember.findUnique.mockResolvedValue(null);
    await expect(service.acceptExisting('invite-token', 'user-1')).resolves.toEqual({
      company,
      already_member: false,
    });
    expect(tx.user.create).not.toHaveBeenCalled();
    expect(tx.companyMember.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { company_id_user_id: { company_id: company.id, user_id: 'user-1' } },
      }),
    );
    expect(redis.del).toHaveBeenCalledWith('membership:user-1:company-1');
  });

  it('é idempotente quando convite aceito já possui o mesmo membro', async () => {
    prisma.companyInvite.findUnique.mockResolvedValue({ ...pendingInvite, status: 'ACCEPTED' });
    prisma.user.findUnique.mockResolvedValue({ email: pendingInvite.email });
    prisma.companyMember.findUnique.mockResolvedValue({ id: 'member-1' });
    await expect(service.acceptExisting('invite-token', 'user-1')).resolves.toEqual({
      company,
      already_member: true,
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('recusa convite que saiu do estado pendente sem vínculo correspondente', async () => {
    prisma.companyInvite.findUnique.mockResolvedValue({ ...pendingInvite, status: 'REVOKED' });
    prisma.user.findUnique.mockResolvedValue({ email: pendingInvite.email });
    prisma.companyMember.findUnique.mockResolvedValue(null);
    await expect(service.acceptExisting('invite-token', 'user-1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
