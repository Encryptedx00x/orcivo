import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Validates that resource IDs supplied in a request body belong to the caller's
 * company BEFORE any write. Guards answer "who / which company"; this answers
 * "does this related row belong to that company". See ADR-014 §5.
 *
 * Not found (or belongs to another tenant) => 404 (never reveal existence,
 * consistent with ADR-013).
 */
@Injectable()
export class TenantOwnershipService {
  constructor(private readonly prisma: PrismaService) {}

  async assertCustomer(id: string | undefined, companyId: string): Promise<void> {
    if (!id) return;
    const row = await this.prisma.customer.findFirst({
      where: { id, company_id: companyId },
      select: { id: true },
    });
    if (!row) throw new NotFoundException('Cliente não encontrado');
  }

  async assertQuote(id: string | undefined, companyId: string): Promise<void> {
    if (!id) return;
    const row = await this.prisma.quote.findFirst({
      where: { id, company_id: companyId },
      select: { id: true },
    });
    if (!row) throw new NotFoundException('Orçamento não encontrado');
  }

  async assertWorkOrder(id: string | undefined, companyId: string): Promise<void> {
    if (!id) return;
    const row = await this.prisma.workOrder.findFirst({
      where: { id, company_id: companyId },
      select: { id: true },
    });
    if (!row) throw new NotFoundException('Ordem de serviço não encontrada');
  }

  /** All catalog item IDs must belong to the company (batch). */
  async assertCatalogItems(ids: Array<string | undefined>, companyId: string): Promise<void> {
    const unique = [...new Set(ids.filter((v): v is string => !!v))];
    if (unique.length === 0) return;
    const found = await this.prisma.catalogItem.count({
      where: { id: { in: unique }, company_id: companyId },
    });
    if (found !== unique.length) {
      throw new NotFoundException('Item de catálogo não encontrado');
    }
  }

  /** The assignee must be an ACTIVE member of the company. */
  async assertActiveMember(userId: string | undefined, companyId: string): Promise<void> {
    if (!userId) return;
    const member = await this.prisma.companyMember.findFirst({
      where: { user_id: userId, company_id: companyId, active: true },
      select: { id: true },
    });
    if (!member) throw new NotFoundException('Usuário responsável não encontrado');
  }
}
