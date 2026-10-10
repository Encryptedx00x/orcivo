import { Controller, Get, Query, Req, Res } from '@nestjs/common';
import type { Response } from 'express';
import {
  DataExportQuerySchema,
  ReportPeriodQuerySchema,
  type DataExportQueryDto,
  type ReportPeriodQueryDto,
} from '@orcivo/shared-types';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { ReportsService } from './reports.service';

interface TenantRequest {
  companyId: string;
  user: { userId: string };
}

@Controller()
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('reports')
  report(
    @Req() req: TenantRequest,
    @Query(new ZodValidationPipe(ReportPeriodQuerySchema)) query: unknown,
  ) {
    const { from, to } = query as ReportPeriodQueryDto;
    return this.reports.report(req.companyId, new Date(from), new Date(to));
  }

  @Get('data-export/csv')
  async csv(
    @Req() req: TenantRequest,
    @Query(new ZodValidationPipe(DataExportQuerySchema)) query: unknown,
    @Res() res: Response,
  ) {
    const file = await this.reports.exportCsv(
      req.companyId,
      (query as DataExportQueryDto).entity,
      req.user.userId,
    );
    res.setHeader('Content-Type', file.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
    res.send(file.buffer);
  }

  @Get('data-export/zip')
  async zip(@Req() req: TenantRequest, @Res() res: Response) {
    const file = await this.reports.exportZip(req.companyId, req.user.userId);
    res.setHeader('Content-Type', file.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
    res.send(file.buffer);
  }
}
