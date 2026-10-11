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

export default async function ClientesPage(): Promise<React.JSX.Element> {
  const data = await apiFetch<{ data: Customer[] }>('/customers?page=1&limit=20');
  return <ClientesContent customers={data.data} />;
}
