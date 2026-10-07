import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { CompanyProfileUpdateDto } from './company-profile-update.schema';
import { PrismaService } from '../prisma/prisma.service';
import { PHOTO_BUCKET, StorageService } from '../storage/storage.service';
import { AuditService } from '../audit/audit.service';
import type { AuditJsonValue } from '../audit/audit.types';

type ApprovalMethod = 'APPROVE_BUTTON' | 'TYPED_NAME' | 'DRAWN_SIGNATURE' | 'PHOTO_SIGNATURE';

const COMPANY_SELECT = {
  id: true,
  trade_name: true,
  document_type: true,
  document: true,
  phone: true,
  city: true,
  state: true,
  address: true,
  brand_color: true,
  logo_url: true,
  pix_key: true,
  quote_default_terms: true,
  quote_default_validity_days: true,
  quote_default_doc_options: true,
  plan_code: true,
  allowed_approval_methods: true,
} as const;

// pix_key_type is validation-only input (see company-profile-update.schema.ts) —
// there is no matching Company column, so it is stripped before persistence/audit.
const PROFILE_FIELD_LABELS: Record<
  | 'trade_name'
  | 'document_type'
  | 'document'
  | 'phone'
  | 'city'
  | 'state'
  | 'address'
  | 'pix_key'
  | 'quote_default_terms'
  | 'quote_default_validity_days'
  | 'quote_default_doc_options',
  string
> = {
  trade_name: 'nome fantasia',
  document_type: 'tipo de documento',
  document: 'documento',
  phone: 'telefone',
  city: 'cidade',
  state: 'estado',
  address: 'endereço',
  pix_key: 'chave Pix',
  quote_default_terms: 'condições padrão',
  quote_default_validity_days: 'validade padrão',
  quote_default_doc_options: 'o que vai no orçamento',
};

@Injectable()
export class CompanyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly storage: StorageService,
  ) {}

  async findCurrent(companyId: string) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: COMPANY_SELECT,
    });
    if (!company) throw new NotFoundException();
    // logo_url holds a storage key; screens get a short-lived URL to show it.
    return { ...company, logo_url: await this.logoUrl(company.logo_url) };
  }

  private async logoUrl(stored: string | null): Promise<string | null> {
    if (!stored) return null;
    if (/^https?:/i.test(stored)) return stored;
    return this.storage.getSignedUrl(PHOTO_BUCKET, stored).catch(() => null);
  }

  /** Logo used on quote, receipt and service PDFs (PNG, JPEG or WebP up to 2 MB). */
  async uploadLogo(
    companyId: string,
    file: { buffer: Buffer; mimetype: string } | undefined,
    userId: string,
  ) {
    if (!file) throw new BadRequestException('Envie a imagem do logo.');
    this.storage.assertUploadable(file.buffer, file.mimetype, 2 * 1024 * 1024, [
      'image/png',
      'image/jpeg',
      'image/webp',
    ]);
    const key = `${companyId}/branding/logo`;
    await this.storage.uploadBuffer(PHOTO_BUCKET, key, file.buffer, file.mimetype);
    await this.prisma.$transaction(async (tx) => {
      await tx.company.update({ where: { id: companyId }, data: { logo_url: key } });
      await this.audit.record(tx, {
        companyId,
        actorType: 'USER',
        actorUserId: userId,
        action: 'company.logo_updated',
        entityType: 'company',
        entityId: companyId,
        humanText: 'Logo da empresa atualizado',
      });
    });
    return this.findCurrent(companyId);
  }

  async removeLogo(companyId: string, userId: string) {
    const before = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { logo_url: true },
    });
    await this.prisma.$transaction(async (tx) => {
      await tx.company.update({ where: { id: companyId }, data: { logo_url: null } });
      await this.audit.record(tx, {
        companyId,
        actorType: 'USER',
        actorUserId: userId,
        action: 'company.logo_removed',
        entityType: 'company',
        entityId: companyId,
        humanText: 'Logo da empresa removido',
      });
    });
    if (before?.logo_url && !/^https?:/i.test(before.logo_url)) {
      await this.storage.deleteObject(PHOTO_BUCKET, before.logo_url).catch(() => undefined);
    }
    return this.findCurrent(companyId);
  }

  async getDashboard(companyId: string) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [quotesPending, workOrdersOpen, revenueResult] = await Promise.all([
      this.prisma.quote.count({
        where: { company_id: companyId, status: 'SENT' },
      }),
      this.prisma.workOrder.count({
        where: { company_id: companyId, status: { in: ['PENDING', 'IN_PROGRESS'] } },
      }),
      this.prisma.quote.aggregate({
        where: {
          company_id: companyId,
          status: 'APPROVED',
          created_at: { gte: startOfMonth },
        },
        _sum: { total: true },
      }),
    ]);

    return {
      quotes_pending: quotesPending,
      work_orders_open: workOrdersOpen,
      revenue_month: revenueResult._sum.total?.toString() ?? '0.00',
      next_appointment: null,
    };
  }

  async getMembers(companyId: string) {
    const members = await this.prisma.companyMember.findMany({
      where: { company_id: companyId, active: true },
      orderBy: { created_at: 'asc' },
      select: {
        id: true,
        role: true,
        user: { select: { name: true, email: true } },
      },
    });
    return members;
  }

  async updateApprovalMethods(companyId: string, methods: ApprovalMethod[], userId: string) {
    const before = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { trade_name: true, allowed_approval_methods: true },
    });
    if (!before) throw new NotFoundException();

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.company.update({
        where: { id: companyId },
        data: { allowed_approval_methods: methods } as never,
        select: COMPANY_SELECT,
      });
      await this.audit.record(tx, {
        companyId,
        actorType: 'USER',
        actorUserId: userId,
        action: 'company.approval_methods_changed',
        entityType: 'company',
        entityId: companyId,
        from: [...before.allowed_approval_methods],
        to: [...methods],
        humanText:
          `Métodos de aprovação de "${before.trade_name}" alterados para ` +
          `${methods.join(', ') || '(nenhum)'}`,
      });
      return updated;
    });
  }

  async updateProfile(companyId: string, dto: CompanyProfileUpdateDto, userId: string) {
    const before = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: COMPANY_SELECT,
    });
    if (!before) throw new NotFoundException();

    // pix_key_type only selects which format `pix_key` is validated against; it has no column.
    const persistable: Record<string, AuditJsonValue | undefined> = { ...dto };
    delete persistable['pix_key_type'];

    const changedKeys = (Object.keys(persistable) as (keyof typeof PROFILE_FIELD_LABELS)[]).filter(
      (key) => persistable[key] !== undefined,
    );

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.company.update({
        where: { id: companyId },
        data: persistable as never,
        select: COMPANY_SELECT,
      });

      const from: Record<string, AuditJsonValue> = {};
      const to: Record<string, AuditJsonValue> = {};
      for (const key of changedKeys) {
        // Prisma Json values are plain JSON here (doc options object).
        from[key] = (before[key] ?? null) as AuditJsonValue;
        to[key] = (updated[key] ?? null) as AuditJsonValue;
      }
      const changedLabels = changedKeys.map((key) => PROFILE_FIELD_LABELS[key]);

      await this.audit.record(tx, {
        companyId,
        actorType: 'USER',
        actorUserId: userId,
        action: 'company.profile_updated',
        entityType: 'company',
        entityId: companyId,
        from,
        to,
        humanText:
          `Dados de "${before.trade_name}" atualizados` +
          (changedLabels.length ? ` (${changedLabels.join(', ')})` : ''),
      });
      return updated;
    });
  }
}
