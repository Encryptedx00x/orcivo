import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type {
  AppointmentCreateDto,
  AppointmentListQueryDto,
} from './appointment.dto';

const customerSelect = { select: { id: true, name: true } };

@Injectable()
export class AppointmentService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: AppointmentCreateDto, companyId: string, userId: string) {
    if (dto.customer_id) {
      const customer = await this.prisma.customer.findFirst({
        where: { id: dto.customer_id, company_id: companyId },
        select: { id: true },
      });
      if (!customer) throw new NotFoundException('Cliente não encontrado');
    }

    return this.prisma.appointment.create({
      data: {
        company_id: companyId,
        customer_id: dto.customer_id,
        work_order_id: dto.work_order_id,
        title: dto.title,
        type: dto.type ?? 'OUTRO',
        notes: dto.notes,
        starts_at: new Date(dto.starts_at),
        ends_at: dto.ends_at ? new Date(dto.ends_at) : undefined,
        created_by_user_id: userId,
      },
      include: { customer: customerSelect },
    });
  }

  async findAll(companyId: string, query: AppointmentListQueryDto) {
    const where = {
      company_id: companyId,
      ...(query.from || query.to
        ? {
            starts_at: {
              ...(query.from ? { gte: new Date(query.from) } : {}),
              ...(query.to ? { lte: new Date(query.to) } : {}),
            },
          }
        : {}),
    };
    const data = await this.prisma.appointment.findMany({
      where,
      orderBy: { starts_at: 'asc' },
      include: { customer: customerSelect },
      take: 500,
    });
    return { data };
  }

  async remove(id: string, companyId: string) {
    const appointment = await this.prisma.appointment.findFirst({
      where: { id, company_id: companyId },
      select: { id: true },
    });
    if (!appointment) throw new NotFoundException('Compromisso não encontrado');
    await this.prisma.appointment.delete({ where: { id } });
    return { ok: true };
  }
}
