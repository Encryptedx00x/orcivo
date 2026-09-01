import { SetMetadata } from '@nestjs/common';
import type { MemberRole } from '@prisma/client';

export const ROLES_KEY = 'roles';

/**
 * Restrict a route (or controller) to the given membership roles.
 * Enforced by RoleGuard against req.role (set by TenantGuard).
 * Absence of @Roles = any active member.
 */
export const Roles = (...roles: MemberRole[]) => SetMetadata(ROLES_KEY, roles);

/** admin-capable = OWNER + ADMIN (see ADR-014). */
export const AdminOnly = () => Roles('OWNER', 'ADMIN');
