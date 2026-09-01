import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { CatalogItemCreateSchema, CatalogItemUpdateSchema } from '@orcivo/shared-types';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { CatalogService } from './catalog.service';

// Tenant context set by the global TenantGuard — see ADR-014.
interface TenantRequest {
  companyId: string;
}

@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get()
  findAll(@Req() req: TenantRequest, @Query('all') all?: string) {
    return this.catalogService.findAll(req.companyId, all !== 'true');
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: TenantRequest) {
    return this.catalogService.findOne(id, req.companyId);
  }

  @Post()
  @HttpCode(201)
  create(
    @Body(new ZodValidationPipe(CatalogItemCreateSchema)) body: unknown,
    @Req() req: TenantRequest,
  ) {
    return this.catalogService.create(body as never, req.companyId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(CatalogItemUpdateSchema)) body: unknown,
    @Req() req: TenantRequest,
  ) {
    return this.catalogService.update(id, body as never, req.companyId);
  }

  @Delete(':id')
  @HttpCode(200)
  deactivate(@Param('id') id: string, @Req() req: TenantRequest) {
    return this.catalogService.deactivate(id, req.companyId);
  }
}
