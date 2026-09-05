import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

type ApprovalMethod = 'APPROVE_BUTTON' | 'TYPED_NAME' | 'DRAWN_SIGNATURE';

const COMPANY_SELECT = {
  id: true,
  trade_name: true,
  document_type: true,
  document: true,
  phone: true,
  city: true,
  state: true,
  brand_color: true,
  logo_url: true,
  pix_key: true,
  plan_code: true,
  allowed_approval_methods: true,
} as const;

@Injectable()
export class CompanyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async findCurrent(companyId: string) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: COMPANY_SELECT,
    });
    if (!company) throw new NotFoundException();
    return company;
  }

  async getDashboard(companyId: string) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [quotesPending, workOrdersOpen, revenueResult] = await Promise.all([
      this.prisma.quote.count({
        where: { company_id: companyId, status: 'SENT' },
      }),
      this.prisma.workOrder.count({
        where: { company_id: companyId, status: { in: ['PENDING', 'IN_PROGRESS'] } },
      }),
      this.prisma.quote.aggregate({
        where: {
          company_id: companyId,
          status: 'APPROVED',
          created_at: { gte: startOfMonth },
        },
        _sum: { total: true },
      }),
    ]);

    return {
      quotes_pending: quotesPending,
      work_orders_open: workOrdersOpen,
      revenue_month: revenueResult._sum.total?.toString() ?? '0.00',
      next_appointment: null,
    };
  }

  async getMembers(companyId: string) {
    const members = await this.prisma.companyMember.findMany({
      where: { company_id: companyId, active: true },
      orderBy: { created_at: 'asc' },
      select: {
        id: true,
        role: true,
        user: { select: { name: true, email: true } },
      },
    });
    return members;
  }

  async updateApprovalMethods(companyId: string, methods: ApprovalMethod[], userId: string) {
    const before = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { trade_name: true, allowed_approval_methods: true },
    });
    if (!before) throw new NotFoundException();

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.company.update({
        where: { id: companyId },
        data: { allowed_approval_methods: methods } as never,
        select: COMPANY_SELECT,
      });
      await this.audit.record(tx, {
        companyId,
        actorType: 'USER',
        actorUserId: userId,
        action: 'company.approval_methods_changed',
        entityType: 'company',
        entityId: companyId,
        from: [...before.allowed_approval_methods],
        to: [...methods],
        humanText:
          `Métodos de aprovação de "${before.trade_name}" alterados para ` +
          `${methods.join(', ') || '(nenhum)'}`,
      });
      return updated;
    });
  }
}
