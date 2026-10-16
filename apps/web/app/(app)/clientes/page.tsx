import { apiFetch } from '../../../lib/api';
import type { PlanUsageResponse } from '@orcivo/shared-types';
import { ClientesContent } from './ClientesContent';

interface Customer {
  id: string;
  name: string;
  phone: string | null;
  city: string | null;
  state: string | null;
  created_at: string | null;
}

export default async function ClientesPage(): Promise<React.JSX.Element> {
  const [data, usage] = await Promise.all([
    apiFetch<{ data: Customer[] }>('/customers?page=1&limit=20'),
    apiFetch<PlanUsageResponse>('/company/me/usage'),
  ]);
  return (
    <ClientesContent
      customers={data.data}
      usage={usage.resources.find((resource) => resource.code === 'CUSTOMERS')}
    />
  );
}
