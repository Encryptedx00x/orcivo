export interface TenantRequest {
  companyId: string;
  user: { userId: string; email: string };
}
