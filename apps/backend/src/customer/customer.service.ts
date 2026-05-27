import { Injectable, NotFoundException } from '@nestjs/common';
import { CustomerCreateDto, CustomerListQueryDto } from '@orcivo/shared-types';
import { PrismaService } from '../prisma/prisma.service';
import { PlanLimitsService } from '../plan-limits/plan-limits.service';

@Injectable()
export class CustomerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly planLimitsService: PlanLimitsService,
  ) {}

  async create(dto: CustomerCreateDto, companyId: string) {
    await this.planLimitsService.enforceLimit(companyId, 'CUSTOMERS');
    return this.prisma.customer.create({
      data: {
        ...dto,
        company_id: companyId,
      },
    });
  }

  async findAll(companyId: string, query: CustomerListQueryDto) {
    const { page, limit, search } = query;
    const where = {
      company_id: companyId,
      ...(search ? { name: { contains: search, mode: 'insensitive' as const } } : {}),
    };
    const data = await this.prisma.customer.findMany({
      where,
      orderBy: { created_at: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, page, limit };
  }

  async findOne(id: string, companyId: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id, company_id: companyId },
    });
    if (!customer) throw new NotFoundException();
    return customer;
  }
}
