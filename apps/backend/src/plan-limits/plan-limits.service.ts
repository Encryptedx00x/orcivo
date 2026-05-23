import { Injectable } from '@nestjs/common';
import { PlanFeature } from '@orcivo/shared-types';
import { PrismaService } from '../prisma/prisma.service';

export interface PlanCheckResult {
  allowed: boolean;
  limit?: number;
  reason?: string;
}

@Injectable()
export class PlanLimitsService {
  constructor(private readonly prisma: PrismaService) {}

  async check(companyId: string, feature: PlanFeature): Promise<PlanCheckResult> {
    // Fase 2: todos permitidos — exceto marca d'água para LIVRE
    // Fase 3 plugará enforcement real com billing Asaas
    if (feature === PlanFeature.PDF_WATERMARK) {
      const company = await this.prisma.company.findUniqueOrThrow({
        where: { id: companyId },
      });
      const allowed = company.plan_code !== 'LIVRE';
      return {
        allowed,
        reason: allowed ? undefined : "Orcivo Livre inclui marca d'água no PDF",
      };
    }
    return { allowed: true };
  }
}
