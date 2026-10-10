import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma, type StockMovementEvent } from '@prisma/client';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class StockService {
  constructor(private readonly audit: AuditService) {}

  async deductForQuoteApproval(
    tx: Prisma.TransactionClient,
    companyId: string,
    quoteId: string,
    workOrderId: string,
  ) {
    const company = await tx.company.findUnique({
      where: { id: companyId },
      select: { stock_depletion_event: true },
    });
    if (company?.stock_depletion_event !== 'QUOTE_APPROVAL') return;
    return this.deduct(tx, companyId, quoteId, workOrderId, 'QUOTE_APPROVAL', quoteId);
  }

  async deductForWorkOrderCompletion(
    tx: Prisma.TransactionClient,
    companyId: string,
    workOrderId: string,
  ) {
    const workOrder = await tx.workOrder.findFirst({
      where: { id: workOrderId, company_id: companyId },
      select: {
        quote_id: true,
        finished_at: true,
        company: { select: { stock_depletion_event: true } },
      },
    });
    if (!workOrder?.quote_id || workOrder.company.stock_depletion_event !== 'WORK_ORDER_COMPLETION')
      return;
    return this.deduct(
      tx,
      companyId,
      workOrder.quote_id,
      `${workOrderId}:${workOrder.finished_at?.getTime() ?? 0}`,
      'WORK_ORDER_COMPLETION',
      workOrderId,
    );
  }

  async restoreForWorkOrder(
    tx: Prisma.TransactionClient,
    companyId: string,
    workOrderId: string,
    event: Extract<StockMovementEvent, 'WORK_ORDER_CANCEL' | 'WORK_ORDER_REOPEN'>,
  ) {
    const debits = await tx.stockMovement.findMany({
      where: { company_id: companyId, work_order_id: workOrderId, type: 'DEBIT', reversal: null },
    });
    let restored = 0;
    for (const debit of debits) {
      const updated = await tx.catalogItem.updateMany({
        where: { id: debit.catalog_item_id, company_id: companyId },
        data: { quantity: { increment: debit.quantity.toNumber() } },
      });
      if (updated.count !== 1) {
        throw new BadRequestException('Não foi possível devolver o item ao estoque da empresa.');
      }
      await tx.stockMovement.create({
        data: {
          company_id: companyId,
          catalog_item_id: debit.catalog_item_id,
          quote_id: debit.quote_id,
          work_order_id: workOrderId,
          reference_id: `${workOrderId}:${debit.id}`,
          type: 'CREDIT',
          event,
          quantity: debit.quantity,
          reversal_of_id: debit.id,
        },
      });
      restored += 1;
    }
    if (restored) {
      await this.audit.record(tx, {
        companyId,
        actorType: 'SYSTEM',
        action: 'stock.restored',
        entityType: 'work_order',
        entityId: workOrderId,
        humanText: `Estoque devolvido para ${restored} item(ns) da OS`,
      });
    }
  }

  private async deduct(
    tx: Prisma.TransactionClient,
    companyId: string,
    quoteId: string,
    workOrderId: string,
    event: Extract<StockMovementEvent, 'QUOTE_APPROVAL' | 'WORK_ORDER_COMPLETION'>,
    referenceId: string,
  ) {
    const items = await tx.quoteItem.findMany({
      where: { company_id: companyId, quote_id: quoteId, catalog_item_id: { not: null } },
      select: {
        catalog_item_id: true,
        quantity: true,
        catalog_item: { select: { name: true, type: true } },
      },
    });
    const products = new Map<string, { name: string; quantity: Prisma.Decimal }>();
    for (const item of items) {
      if (!item.catalog_item_id || item.catalog_item?.type !== 'PRODUCT') continue;
      const current = products.get(item.catalog_item_id);
      products.set(item.catalog_item_id, {
        name: item.catalog_item.name,
        quantity: current ? current.quantity.plus(item.quantity) : item.quantity,
      });
    }
    let deducted = 0;
    for (const [catalogItemId, item] of products) {
      if (!item.quantity.isInteger()) {
        throw new BadRequestException(
          `O produto "${item.name}" usa estoque inteiro; ajuste a quantidade do orçamento.`,
        );
      }
      const quantity = item.quantity.toNumber();
      const key = {
        company_id_catalog_item_id_event_reference_id: {
          company_id: companyId,
          catalog_item_id: catalogItemId,
          event,
          reference_id: referenceId,
        },
      } as const;
      const previousDebit = await tx.stockMovement.findFirst({
        where: {
          company_id: companyId,
          catalog_item_id: catalogItemId,
          work_order_id: workOrderId,
          type: 'DEBIT',
          reversal: null,
        },
      });
      if (previousDebit) continue;
      if (await tx.stockMovement.findUnique({ where: key })) continue;
      const updated = await tx.catalogItem.updateMany({
        where: {
          id: catalogItemId,
          company_id: companyId,
          type: 'PRODUCT',
          quantity: { gte: quantity },
        },
        data: { quantity: { decrement: quantity } },
      });
      if (updated.count !== 1) {
        throw new BadRequestException(`Estoque insuficiente para "${item.name}".`);
      }
      await tx.stockMovement.create({
        data: {
          company_id: companyId,
          catalog_item_id: catalogItemId,
          quote_id: quoteId,
          work_order_id: workOrderId,
          reference_id: referenceId,
          type: 'DEBIT',
          event,
          quantity: item.quantity,
        },
      });
      deducted += 1;
    }
    if (deducted) {
      await this.audit.record(tx, {
        companyId,
        actorType: 'SYSTEM',
        action: 'stock.deducted',
        entityType: event === 'QUOTE_APPROVAL' ? 'quote' : 'work_order',
        entityId: referenceId,
        humanText: `Estoque baixado automaticamente para ${deducted} item(ns)`,
      });
    }
  }
}
