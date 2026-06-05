import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { WorkOrderCreateDto, WorkOrderUpdateDto } from '@orcivo/shared-types';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { PlanLimitsService } from '../plan-limits/plan-limits.service';

type WorkOrderStatus = 'PENDING' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED';

const WO_TRANSITIONS: Record<WorkOrderStatus, WorkOrderStatus[]> = {
  PENDING:     ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['DONE', 'CANCELLED'],
  DONE:        [],
  CANCELLED:   [],
};

@Injectable()
export class WorkOrderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly planLimitsService: PlanLimitsService,
  ) {}

  private async nextWorkOrderNumber(companyId: string): Promise<number> {
    const key = `work-order:seq:${companyId}`;
    const [current, maxResult] = await Promise.all([
      this.redis.get(key),
      this.prisma.workOrder.aggregate({ where: { company_id: companyId }, _max: { number: true } }),
    ]);
    const dbMax = maxResult._max.number ?? 0;
    const redisVal = current !== null ? parseInt(current, 10) : 0;
    if (redisVal < dbMax) {
      await this.redis.set(key, String(dbMax));
    }
    return this.redis.incr(key);
  }

  async create(dto: WorkOrderCreateDto, companyId: string, userId: string, quoteId?: string, initialStatus: WorkOrderStatus = 'PENDING') {
    await this.planLimitsService.enforceLimit(companyId, 'WORK_ORDERS_MONTH');
    const number = await this.nextWorkOrderNumber(companyId);
    return this.prisma.workOrder.create({
      data: {
        company_id: companyId,
        customer_id: dto.customer_id,
        quote_id: quoteId,
        number,
        title: dto.title,
        notes: dto.notes,
        status: initialStatus,
        scheduled_at: dto.scheduled_at ? new Date(dto.scheduled_at) : undefined,
        assigned_to_user_id: dto.assigned_to_user_id,
        created_by_user_id: userId,
        started_at: initialStatus === 'IN_PROGRESS' ? new Date() : undefined,
      },
    });
  }

  async findAll(companyId: string, page = 1, limit = 20) {
    const data = await this.prisma.workOrder.findMany({
      where: { company_id: companyId },
      orderBy: { created_at: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: { customer: { select: { id: true, name: true } }, photos: true },
    });
    return { data, page, limit };
  }

  async findOne(id: string, companyId: string) {
    const wo = await this.prisma.workOrder.findFirst({
      where: { id, company_id: companyId },
      include: { customer: true, photos: true, quote: { select: { id: true, number: true } } },
    });
    if (!wo) throw new NotFoundException();
    return wo;
  }

  async updateStatus(id: string, companyId: string, newStatus: WorkOrderStatus) {
    const wo = await this.findOne(id, companyId);
    const current = wo.status as WorkOrderStatus;
    if (!WO_TRANSITIONS[current].includes(newStatus)) {
      throw new BadRequestException(`Transição inválida: ${current} → ${newStatus}`);
    }
    const data: Record<string, unknown> = { status: newStatus };
    if (newStatus === 'IN_PROGRESS') data.started_at = new Date();
    if (newStatus === 'DONE') data.finished_at = new Date();
    return this.prisma.workOrder.update({ where: { id }, data });
  }

  async update(id: string, dto: WorkOrderUpdateDto, companyId: string) {
    await this.findOne(id, companyId);
    const { status, ...rest } = dto;
    if (status) return this.updateStatus(id, companyId, status as WorkOrderStatus);
    return this.prisma.workOrder.update({
      where: { id },
      data: {
        ...rest,
        scheduled_at: rest.scheduled_at ? new Date(rest.scheduled_at) : undefined,
        started_at: rest.started_at ? new Date(rest.started_at) : undefined,
        finished_at: rest.finished_at ? new Date(rest.finished_at) : undefined,
      },
    });
  }
}
