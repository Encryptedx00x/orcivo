import { Injectable, NotFoundException } from '@nestjs/common';
import { CustomerCreateDto, CustomerListQueryDto } from '@orcivo/shared-types';
import { PrismaService } from '../prisma/prisma.service';
import { PlanLimitsService } from '../plan-limits/plan-limits.service';
import { TenantOwnershipService } from '../common/tenant/tenant-ownership.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class CustomerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly planLimitsService: PlanLimitsService,
    private readonly ownership: TenantOwnershipService,
    private readonly audit: AuditService,
  ) {}

  async create(dto: CustomerCreateDto, companyId: string, userId: string) {
    await this.planLimitsService.enforceLimit(companyId, 'CUSTOMERS');
    await this.ownership.assertActiveMember(dto.assigned_to_user_id, companyId);
    return this.prisma.$transaction(async (tx) => {
      const customer = await tx.customer.create({
        data: {
          ...dto,
          company_id: companyId,
        },
      });
      await this.audit.record(tx, {
        companyId,
        actorType: 'USER',
        actorUserId: userId,
        action: 'customer.created',
        entityType: 'customer',
        entityId: customer.id,
        from: null,
        to: 'ACTIVE',
        humanText: `Cliente "${customer.name}" cadastrado`,
      });
      return customer;
    });
  }

  async findAll(companyId: string, query: CustomerListQueryDto) {
    const { page, limit, search } = query;
    const where = {
      company_id: companyId,
      deleted_at: null,
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
      where: { id, company_id: companyId, deleted_at: null },
    });
    if (!customer) throw new NotFoundException();
    return customer;
  }

  async update(id: string, dto: CustomerCreateDto, companyId: string, userId: string) {
    await this.findOne(id, companyId); // 404 se cross-tenant, inexistente ou já excluído
    await this.ownership.assertActiveMember(dto.assigned_to_user_id, companyId);
    return this.prisma.$transaction(async (tx) => {
      const customer = await tx.customer.update({
        where: { id },
        data: dto,
      });
      await this.audit.record(tx, {
        companyId,
        actorType: 'USER',
        actorUserId: userId,
        action: 'customer.updated',
        entityType: 'customer',
        entityId: customer.id,
        from: null,
        to: null,
        humanText: `Cliente "${customer.name}" atualizado`,
      });
      return customer;
    });
  }

  async remove(id: string, companyId: string, userId: string) {
    const existing = await this.findOne(id, companyId); // 404 se cross-tenant, inexistente ou já excluído
    return this.prisma.$transaction(async (tx) => {
      const customer = await tx.customer.update({
        where: { id },
        data: { deleted_at: new Date() },
      });
      await this.audit.record(tx, {
        companyId,
        actorType: 'USER',
        actorUserId: userId,
        action: 'customer.deleted',
        entityType: 'customer',
        entityId: customer.id,
        from: 'ACTIVE',
        to: 'DELETED',
        humanText: `Cliente "${existing.name}" excluído`,
      });
      return customer;
    });
  }
}
