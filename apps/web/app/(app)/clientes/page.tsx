import { apiFetch } from '../../../lib/api';
import { ClientesContent } from './ClientesContent';

interface Customer {
  id: string;
  name: string;
  phone: string | null;
  city: string | null;
  state: string | null;
  created_at: string | null;
}

export default async function ClientesPage(): Promise<JSX.Element> {
  let customers: Customer[] = [];
  try {
    const data = await apiFetch<{ data: Customer[] }>('/customers?limit=100');
    customers = data.data;
  } catch {}
  return <ClientesContent customers={customers} />;
}
