import { apiFetch } from '../../../../lib/api';
import { notFound } from 'next/navigation';
import { ClienteDetail } from './ClienteDetail';

interface Customer {
  id: string;
  name: string;
  tax_id: string | null;
  phone: string | null;
  phone2: string | null;
  email: string | null;
  cep: string | null;
  street: string | null;
  number: string | null;
  complement: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  notes: string | null;
  created_at: string;
}

interface Quote {
  id: string;
  number: number;
  title: string | null;
  status: string;
  total: string;
  created_at: string;
}

export default async function ClienteDetailPage({
  params,
}: {
  params: { id: string };
}): Promise<JSX.Element> {
  let customer: Customer | null = null;
  const quotes: Quote[] = [];

  try {
    customer = await apiFetch<Customer>(`/customers/${params.id}`);
  } catch {
    notFound();
  }

  // TODO: add customer_id filter to quotes endpoint (Phase 3+)

  if (!customer) notFound();

  return <ClienteDetail customer={customer} quotes={quotes} />;
}
