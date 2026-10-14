import { BadRequestException, NotFoundException } from '@nestjs/common';
import { InviteService } from './invite.service';

describe('InviteService', () => {
  const tx = {
    companyMember: { create: jest.fn() },
    companyInvite: { update: jest.fn() },
  };
  const prisma = {
    companyInvite: { findUnique: jest.fn() },
    user: { create: jest.fn() },
    $transaction: jest.fn(async (callback: (client: typeof tx) => Promise<void>) => callback(tx)),
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

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('distingue convite inexistente sem criar usuário ou vínculo', async () => {
    prisma.companyInvite.findUnique.mockResolvedValue(null);

    await expect(
      service.accept('missing', undefined, 'Pessoa', 'senha-segura'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.user.create).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('aceita convite público, cria o usuário e invalida os caches de tenant', async () => {
    const company = { id: 'company-1', trade_name: 'Empresa convidante' };
    prisma.companyInvite.findUnique.mockResolvedValue({
      id: 'invite-1',
      company_id: company.id,
      email: 'convidado@example.invalid',
      role: 'TECNICO',
      status: 'PENDING',
      expires_at: new Date(Date.now() + 60_000),
      company,
    });
    prisma.user.create.mockResolvedValue({ id: 'user-1' });

    await expect(
      service.accept('invite-token', undefined, 'Pessoa Convidada', 'senha-segura'),
    ).resolves.toEqual({ company });

    expect(prisma.user.create).toHaveBeenCalledWith({
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
    expect(tx.companyInvite.update).toHaveBeenCalledWith({
      where: { id: 'invite-1' },
      data: { status: 'ACCEPTED', accepted_at: expect.any(Date) },
    });
    expect(redis.del).toHaveBeenCalledWith('membership:user-1');
    expect(redis.del).toHaveBeenCalledWith('tenant:user-1');
  });

  it('recusa convite que já saiu do estado pendente', async () => {
    prisma.companyInvite.findUnique.mockResolvedValue({
      id: 'invite-1',
      status: 'ACCEPTED',
      expires_at: new Date(Date.now() + 60_000),
      company: { id: 'company-1' },
    });

    await expect(service.accept('invite-token', 'user-1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
