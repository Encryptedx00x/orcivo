import { Controller, Get, Put, Req, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UsersService } from './users.service';

// Tenant context set by the global TenantGuard — see ADR-014.
interface TenantRequest {
  companyId: string;
  user: { userId: string };
}

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me/signature')
  getSignature(@Req() req: TenantRequest) {
    return this.usersService.getSignature(req.companyId, req.user.userId);
  }

  @Put('me/signature')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 2 * 1024 * 1024 } }))
  saveSignature(@Req() req: TenantRequest, @UploadedFile() file: Express.Multer.File) {
    return this.usersService.saveSignature(req.companyId, req.user.userId, file);
  }
}
