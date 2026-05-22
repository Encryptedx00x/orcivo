import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CompanyService {
  constructor(private readonly prisma: PrismaService) {}

  async findCurrent(companyId: string) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: {
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
      },
    });
    if (!company) throw new NotFoundException();
    return company;
  }
}
