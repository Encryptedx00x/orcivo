import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';

@Processor('quote-expiry')
@Injectable()
export class QuoteExpiryProcessor extends WorkerHost {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job<{ quoteId: string }>): Promise<void> {
    const quote = await this.prisma.quote.findFirst({
      where: { id: job.data.quoteId, status: { in: ['DRAFT', 'SENT'] } },
    });
    if (!quote) return; // já em estado terminal ou não existe
    if (quote.valid_until && quote.valid_until > new Date()) return; // ainda válido

    await this.prisma.quote.update({
      where: { id: job.data.quoteId },
      data: { status: 'EXPIRED' },
    });
  }

  // Cron sweep diário às 2h — fallback para jobs BullMQ perdidos em restart
  @Cron('0 2 * * *')
  async sweepExpiredQuotes(): Promise<void> {
    await this.prisma.quote.updateMany({
      where: {
        valid_until: { lt: new Date() },
        status: { in: ['DRAFT', 'SENT'] },
      },
      data: { status: 'EXPIRED' },
    });
  }
}
