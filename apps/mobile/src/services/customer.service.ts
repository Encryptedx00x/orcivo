import type { CustomerDto } from '@orcivo/shared-types';
import { api } from './api';

export type CustomerDetail = CustomerDto & { tax_id: string | null; notes: string | null };

export const customerService = {
  detail: (id: string) => api.get<CustomerDetail>(`/customers/${encodeURIComponent(id)}`),
};
