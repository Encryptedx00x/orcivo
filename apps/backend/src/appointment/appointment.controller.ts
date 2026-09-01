import { Body, Controller, Delete, Get, HttpCode, Param, Post, Query, Req } from '@nestjs/common';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { AppointmentService } from './appointment.service';
import { AppointmentCreateSchema, AppointmentListQuerySchema } from './appointment.dto';

// Tenant context set by the global TenantGuard — see ADR-014.
interface TenantRequest {
  companyId: string;
  user: { userId: string };
}

@Controller('appointments')
export class AppointmentController {
  constructor(private readonly appointmentService: AppointmentService) {}

  @Get()
  findAll(
    @Req() req: TenantRequest,
    @Query(new ZodValidationPipe(AppointmentListQuerySchema)) query: unknown,
  ) {
    return this.appointmentService.findAll(req.companyId, query as never);
  }

  @Post()
  @HttpCode(201)
  create(
    @Req() req: TenantRequest,
    @Body(new ZodValidationPipe(AppointmentCreateSchema)) body: unknown,
  ) {
    return this.appointmentService.create(body as never, req.companyId, req.user.userId);
  }

  @Delete(':id')
  @HttpCode(200)
  remove(@Param('id') id: string, @Req() req: TenantRequest) {
    return this.appointmentService.remove(id, req.companyId);
  }
}
