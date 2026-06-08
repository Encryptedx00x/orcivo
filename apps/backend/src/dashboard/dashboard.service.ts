import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async summary(companyId: string, userId: string) {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 86_400_000);

    const [
      user,
      company,
      quotesPending,
      osPending,
      receivablesAgg,
      overdueCount,
      appointmentsToday,
      upcoming,
      activity,
    ] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId }, select: { name: true } }),
      this.prisma.company.findUnique({
        where: { id: companyId },
        select: { trade_name: true, plan_code: true },
      }),
      // Orçamentos aguardando aprovação
      this.prisma.quote.aggregate({
        where: { company_id: companyId, status: 'SENT' },
        _count: true,
        _sum: { total: true },
      }),
      // OS abertas/em execução
      this.prisma.workOrder.count({
        where: { company_id: companyId, status: { in: ['PENDING', 'IN_PROGRESS'] } },
      }),
      // Recebimentos pendentes (PENDING/OVERDUE/PARTIAL)
      this.prisma.payment.aggregate({
        where: {
          company_id: companyId,
          status: { in: ['PENDING', 'OVERDUE', 'PARTIAL'] },
        },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.payment.count({
        where: { company_id: companyId, status: 'OVERDUE' },
      }),
      this.prisma.appointment.count({
        where: { company_id: companyId, starts_at: { gte: todayStart, lt: todayEnd } },
      }),
      this.prisma.appointment.findMany({
        where: { company_id: companyId, starts_at: { gte: todayStart, lt: todayEnd } },
        orderBy: { starts_at: 'asc' },
        include: { customer: { select: { id: true, name: true } } },
        take: 8,
      }),
      this.prisma.auditLog.findMany({
        where: { company_id: companyId },
        orderBy: { created_at: 'desc' },
        take: 8,
      }),
    ]);

    return {
      user: { name: user?.name ?? '' },
      company: {
        trade_name: company?.trade_name ?? '',
        plan_code: company?.plan_code ?? 'LIVRE',
      },
      kpis: {
        agenda_today: appointmentsToday,
        os_pending: osPending,
        quotes_pending: quotesPending._count,
        quotes_pending_total: (quotesPending._sum.total ?? 0).toString(),
        receivables_pending_total: (receivablesAgg._sum.amount ?? 0).toString(),
        receivables_pending_count: receivablesAgg._count,
        receivables_overdue_count: overdueCount,
      },
      upcoming: upcoming.map((a) => ({
        id: a.id,
        title: a.title,
        type: a.type,
        starts_at: a.starts_at,
        customer: a.customer,
      })),
      activity: activity.map((a) => ({
        id: a.id,
        action: a.action,
        entity_type: a.entity_type,
        entity_id: a.entity_id,
        created_at: a.created_at,
        metadata: a.metadata,
      })),
    };
  }
}
