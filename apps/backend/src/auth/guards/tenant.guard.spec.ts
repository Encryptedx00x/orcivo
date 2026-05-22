// Wave 0 stub — implementação real em P02. Ver VALIDATION.md Per-Task Verification Map.

describe('TenantGuard', () => {
  it.todo('AUTH-03: TenantGuard injeta companyId correto no request via Redis cache');
  it.todo('AUTH-03: TenantGuard bloqueia user sem membership ativo (ForbiddenException)');
  it.todo('AUTH-03: TenantGuard usa cache Redis 60s e busca no banco em cache miss');
});
