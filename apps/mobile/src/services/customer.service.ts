import type { CustomerDto } from '@orcivo/shared-types';
import { api } from './api';

export type CustomerDetail = CustomerDto & {
  tax_id: string | null;
  notes: string | null;
  phone2: string | null;
  origin: 'INDICATION' | 'INSTAGRAM' | 'GOOGLE' | 'FACEBOOK' | 'OTHER' | null;
  birthday: string | null;
  internal_notes: string | null;
};

export const customerService = {
  detail: (id: string) => api.get<CustomerDetail>(`/customers/${encodeURIComponent(id)}`),
};
