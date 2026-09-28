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
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  CatalogImportRequestSchema,
  CatalogItemCreateSchema,
  CatalogItemUpdateSchema,
} from '@orcivo/shared-types';
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

  @Get('low-stock')
  findLowStock(@Req() req: TenantRequest) {
    return this.catalogService.findLowStock(req.companyId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: TenantRequest) {
    return this.catalogService.findOne(id, req.companyId);
  }

  @Post(':id/photo')
  @HttpCode(201)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  uploadPhoto(
    @Param('id') id: string,
    @Req() req: TenantRequest,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.catalogService.uploadPhoto(id, req.companyId, file);
  }

  @Delete(':id/photo')
  @HttpCode(200)
  deletePhoto(@Param('id') id: string, @Req() req: TenantRequest) {
    return this.catalogService.deletePhoto(id, req.companyId);
  }

  @Post()
  @HttpCode(201)
  create(
    @Body(new ZodValidationPipe(CatalogItemCreateSchema)) body: unknown,
    @Req() req: TenantRequest,
  ) {
    return this.catalogService.create(body as never, req.companyId);
  }

  /** Accepts either `{ items: [...] }` (JSON) or `{ csv: "header,..." }`. */
  @Post('import')
  @HttpCode(200)
  import(
    @Body(new ZodValidationPipe(CatalogImportRequestSchema)) body: unknown,
    @Req() req: TenantRequest,
  ) {
    return this.catalogService.import(body as never, req.companyId);
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
