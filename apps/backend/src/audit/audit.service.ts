import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { AuditRecordInput } from '@orcivo/shared-types';

/**
 * ADR-015 — central audit trail.
 *
 * `AuditService.record` writes exactly one structured row per call and MUST
 * be called with the caller's own transaction client, so the audit row
 * commits/rolls back atomically with the mutation it documents (AC1):
 *
 *   await this.prisma.$transaction(async (tx) => {
 *     const quote = await tx.quote.update({ ... });
 *     await this.auditService.record(tx, {
 *       companyId: quote.company_id,
 *       actorType: 'USER',
 *       actorUserId: userId,
 *       action: 'quote.approved',
 *       entityType: 'quote',
 *       entityId: quote.id,
 *       from: 'SENT',
 *       to: 'APPROVED',
 *       humanText: `Orçamento #${quote.number} (${customerName}) aprovado`,
 *     });
 *     return quote;
 *   });
 *
 * `humanText` must name the entity/context/customer (AC7) — never a generic
 * label like "Orçamento aprovou o orçamento". This service intentionally has
 * no per-field diffing/enterprise audit machinery (AC8): `from`/`to`/`reason`
 * are whatever the caller considers the meaningful before/after state.
 */
@Injectable()
export class AuditService {
  async record(tx: Prisma.TransactionClient, input: AuditRecordInput): Promise<void> {
    await tx.auditLog.create({
      data: {
        company_id: input.companyId,
        actor_type: input.actorType,
        actor_user_id: input.actorUserId ?? null,
        action: input.action,
        entity_type: input.entityType,
        entity_id: input.entityId,
        metadata: {
          from: input.from ?? null,
          to: input.to ?? null,
          reason: input.reason ?? null,
          humanText: input.humanText,
        },
      },
    });
  }
}
