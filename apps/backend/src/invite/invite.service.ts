import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { PlanLimitsService } from '../plan-limits/plan-limits.service';

@Injectable()
export class InviteService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly limits: PlanLimitsService,
  ) {}

  async create(companyId: string, invitedBy: string, email: string, role: 'ADMIN' | 'TECNICO') {
    await this.limits.enforceLimit(companyId, 'MEMBERS');

    const existing = await this.prisma.companyMember.findFirst({
      where: { company_id: companyId, user: { email } },
    });
    if (existing) throw new BadRequestException('Este e-mail já é membro da empresa.');

    const pendingInvite = await this.prisma.companyInvite.findFirst({
      where: { company_id: companyId, email, status: 'PENDING' },
    });
    if (pendingInvite) throw new BadRequestException('Já existe um convite pendente para este e-mail.');

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const invite = await this.prisma.companyInvite.create({
      data: { company_id: companyId, email, role, invited_by: invitedBy, expires_at: expiresAt },
      include: { company: true },
    });

    const appUrl = process.env['APP_URL'] ?? 'https://app.orcivo.com.br';
    const inviteUrl = `${appUrl}/convite/${invite.token}`;
    await this.mail.send({
      to: email,
      subject: `Convite para ${invite.company.trade_name} no Orcivo`,
      html: `<p>Você foi convidado para fazer parte da equipe <strong>${invite.company.trade_name}</strong> no Orcivo.</p><p><a href="${inviteUrl}">Aceitar convite</a></p>`,
    });

    return invite;
  }

  async accept(token: string, userId?: string, name?: string, password?: string) {
    const invite = await this.prisma.companyInvite.findUnique({
      where: { token },
      include: { company: true },
    });

    if (!invite) throw new NotFoundException('Convite não encontrado.');
    if (invite.status !== 'PENDING') throw new BadRequestException('Convite já foi usado ou expirou.');
    if (invite.expires_at < new Date()) {
      await this.prisma.companyInvite.update({ where: { id: invite.id }, data: { status: 'EXPIRED' } });
      throw new BadRequestException('Convite expirado.');
    }

    let targetUserId = userId;
    if (!targetUserId) {
      if (!name || !password) throw new BadRequestException('Nome e senha são obrigatórios para criar conta.');
      const argon2 = await import('argon2');
      const hash = await argon2.hash(password);
      const acceptedTermsAt = new Date();
      const newUser = await this.prisma.user.create({
        data: { name, email: invite.email, password_hash: hash, accepted_terms_at: acceptedTermsAt },
      });
      targetUserId = newUser.id;
    }

    await this.prisma.$transaction([
      this.prisma.companyMember.create({
        data: { company_id: invite.company_id, user_id: targetUserId, role: invite.role },
      }),
      this.prisma.companyInvite.update({
        where: { id: invite.id },
        data: { status: 'ACCEPTED', accepted_at: new Date() },
      }),
    ]);

    return { company: invite.company };
  }

  async list(companyId: string) {
    return this.prisma.companyInvite.findMany({
      where: { company_id: companyId, status: 'PENDING' },
      orderBy: { created_at: 'desc' },
    });
  }

  async revoke(companyId: string, inviteId: string) {
    const invite = await this.prisma.companyInvite.findFirst({ where: { id: inviteId, company_id: companyId } });
    if (!invite) throw new NotFoundException('Convite não encontrado.');
    return this.prisma.companyInvite.update({ where: { id: inviteId }, data: { status: 'REVOKED' } });
  }
}
