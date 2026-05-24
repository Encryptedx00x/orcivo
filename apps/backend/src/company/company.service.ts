import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type ApprovalMethod = 'APPROVE_BUTTON' | 'TYPED_NAME' | 'DRAWN_SIGNATURE';

const COMPANY_SELECT = {
  id: true,
  trade_name: true,
  document_type: true,
  document: true,
  phone: true,
  city: true,
  state: true,
  brand_color: true,
  logo_url: true,
  pix_key: true,
  plan_code: true,
  allowed_approval_methods: true,
} as const;

@Injectable()
export class CompanyService {
  constructor(private readonly prisma: PrismaService) {}

  async findCurrent(companyId: string) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: COMPANY_SELECT,
    });
    if (!company) throw new NotFoundException();
    return company;
  }

  async updateApprovalMethods(companyId: string, methods: ApprovalMethod[]) {
    return this.prisma.company.update({
      where: { id: companyId },
      data: { allowed_approval_methods: methods } as never,
      select: COMPANY_SELECT,
    });
  }
}
