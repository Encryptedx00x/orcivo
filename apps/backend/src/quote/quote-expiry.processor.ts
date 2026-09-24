import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Job } from 'bullmq';
import { QUOTE_ACTIONS } from '@orcivo/shared-types';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

// Ação de domínio `expirar` (PB1-P01/ADR-016): a lista de estados elegíveis
// vem da máquina compartilhada — sem cópia local.
const EXPIRABLE_STATUSES = QUOTE_ACTIONS.expirar.allowedFrom;

@Processor('quote-expiry')
@Injectable()
export class QuoteExpiryProcessor extends WorkerHost {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {
    super();
  }

  async process(job: Job<{ quoteId: string }>): Promise<void> {
    await this.expireIfDue(job.data.quoteId, 'job');
  }

  // Cron sweep diário às 2h — fallback para jobs BullMQ perdidos em restart
  @Cron('0 2 * * *')
  async sweepExpiredQuotes(): Promise<void> {
    const stale = await this.prisma.quote.findMany({
      where: {
        valid_until: { lt: new Date() },
        status: { in: [...EXPIRABLE_STATUSES] },
      },
      select: { id: true },
    });

    for (const { id } of stale) {
      await this.expireIfDue(id, 'sweep');
    }
  }

  /**
   * Expira um orçamento se — e somente se — ele ainda está elegível no momento
   * do UPDATE transacional. Entre a leitura inicial e o UPDATE o orçamento pode
   * ter sido aprovado/recusado/cancelado/reaberto ou ganho uma nova validade
   * (por outro worker de expiração, pela varredura ou por uma ação do usuário).
   * A condição de elegibilidade vai no próprio `updateMany`; a linha de auditoria
   * só é escrita quando esse UPDATE de fato mudou a linha (`count > 0`), então
   * nunca gravamos uma auditoria descrevendo um estado obsoleto.
   */
  private async expireIfDue(quoteId: string, trigger: 'job' | 'sweep'): Promise<void> {
    const quote = await this.prisma.quote.findFirst({
      where: { id: quoteId, status: { in: [...EXPIRABLE_STATUSES] } },
      select: {
        id: true,
        number: true,
        company_id: true,
        customer: { select: { name: true } },
      },
    });
    if (!quote) return; // já em estado terminal ou não existe

    await this.prisma.$transaction(async (tx) => {
      // Estado anterior autoritativo, lido dentro da transação.
      const current = await tx.quote.findUnique({
        where: { id: quoteId },
        select: { status: true },
      });
      if (!current || !EXPIRABLE_STATUSES.includes(current.status as never)) return;

      const result = await tx.quote.updateMany({
        where: {
          id: quoteId,
          status: current.status,
          valid_until: { lt: new Date() }, // ainda vencido no instante do UPDATE
        },
        data: { status: 'EXPIRED' },
      });
      // Aprovação/cancelamento/reabertura concorrente, ou validade estendida,
      // entre a leitura e o UPDATE: a linha não bate mais o filtro — não expira
      // nem grava auditoria obsoleta.
      if (result.count === 0) return;

      // actorType SYSTEM: expiração automática, sem membro logado (ADR-015).
      await this.audit.record(tx, {
        companyId: quote.company_id,
        actorType: 'SYSTEM',
        action: 'quote.expired',
        entityType: 'quote',
        entityId: quote.id,
        from: current.status,
        to: 'EXPIRED',
        humanText:
          `Orçamento #${quote.number} (${quote.customer?.name ?? 'cliente'}) expirou ` +
          (trigger === 'sweep'
            ? 'automaticamente (varredura diária)'
            : 'automaticamente por atingir a validade'),
      });
    });
  }
}
