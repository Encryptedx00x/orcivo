// @orcivo/shared-types — DTOs, Zod schemas, enums
// REGRA CRITICA: NAO importar @prisma/client, @nestjs/*, react, react-native neste package
// Este package e consumido por backend, mobile e web — deve ser agnostico de framework

import { z } from 'zod';

export const PlanCodeEnum = z.enum(['LIVRE', 'SOLO', 'MAIS', 'EQUIPE']);
export const CustomerTypeEnum = z.enum(['PF', 'PJ']);
export const DocumentTypeEnum = z.enum(['CPF', 'CNPJ']);

export type PlanCode = z.infer<typeof PlanCodeEnum>;
export type CustomerType = z.infer<typeof CustomerTypeEnum>;
export type DocumentType = z.infer<typeof DocumentTypeEnum>;

export * from './auth/signup-step1.dto';
export * from './auth/signup-step2.dto';
export * from './auth/login.dto';
export * from './customer/customer-create.dto';
export * from './customer/customer-list.dto';
export * from './catalog/catalog-item-create.dto';
export * from './catalog/catalog-item-update.dto';
export * from './quote/quote-create.dto';
export * from './quote/quote-update.dto';
export * from './quote/quote-status.enum';
export * from './quote/quote-approval.dto';
export * from './quote/quote-doc-options';
export * from './work-order/work-order-create.dto';
export * from './work-order/work-order-update.dto';
export * from './plan/plan-feature.enum';
export * from './auth/forgot-password.dto';
export * from './auth/reset-password.dto';
export * from './helpers/money';
export * from './helpers/br-format';
export * from './billing/subscription.dto';
export * from './invite/invite.dto';
export * from './notification';
export * from './company/company-doc-fields';
export * from './quote/quote-payment-terms';
