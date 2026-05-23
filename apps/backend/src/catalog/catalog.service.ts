import { Injectable, NotFoundException } from '@nestjs/common';
import { CatalogItemCreateDto, CatalogItemUpdateDto } from '@orcivo/shared-types';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(companyId: string, onlyActive = true) {
    return this.prisma.catalogItem.findMany({
      where: { company_id: companyId, ...(onlyActive ? { is_active: true } : {}) },
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
    });
  }

  async findOne(id: string, companyId: string) {
    const item = await this.prisma.catalogItem.findFirst({
      where: { id, company_id: companyId },
    });
    if (!item) throw new NotFoundException();
    return item;
  }

  async create(dto: CatalogItemCreateDto, companyId: string) {
    return this.prisma.catalogItem.create({ data: { ...dto, company_id: companyId } });
  }

  async update(id: string, dto: CatalogItemUpdateDto, companyId: string) {
    await this.findOne(id, companyId); // lança 404 se cross-tenant
    return this.prisma.catalogItem.update({ where: { id }, data: dto });
  }

  async deactivate(id: string, companyId: string) {
    await this.findOne(id, companyId); // lança 404 se cross-tenant
    return this.prisma.catalogItem.update({ where: { id }, data: { is_active: false } });
  }
}
