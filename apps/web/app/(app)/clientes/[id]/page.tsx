import { apiFetch } from '../../../../lib/api';
import { notFound } from 'next/navigation';
import { ClienteDetail, type CustomerPayment, type CustomerWorkOrder } from './ClienteDetail';

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

  if (!customer) notFound();

  // This customer's quotes, services and payments (tabs of the detail page).
  const q = `customer_id=${encodeURIComponent(customer.id)}`;
  const [quoteRes, woRes, payRes] = await Promise.all([
    apiFetch<{ data: Quote[] }>(`/quotes?${q}&limit=100`).catch(() => ({ data: [] })),
    apiFetch<{ data: CustomerWorkOrder[] }>(`/work-orders?${q}&limit=100`).catch(() => ({
      data: [],
    })),
    apiFetch<{ data: CustomerPayment[] }>(`/payments?${q}`).catch(() => ({ data: [] })),
  ]);
  quotes.push(...quoteRes.data);

  return (
    <ClienteDetail
      customer={customer}
      quotes={quotes}
      workOrders={woRes.data}
      payments={payRes.data}
    />
  );
}
