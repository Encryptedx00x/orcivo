import type { MemberRole } from '@prisma/client';

export interface TenantRequest {
  companyId: string;
  role: MemberRole;
  user: { userId: string; email: string };
}
