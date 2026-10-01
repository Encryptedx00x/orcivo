import { quoteService } from '../../../lib/quote.service';
import { fetchAllWorkOrders } from '../../../lib/work-order.service';
import { DocumentosContent, type DocQuote, type DocWorkOrder } from './DocumentosContent';

export default async function DocumentosPage(): Promise<JSX.Element> {
  const [quotesRes, workOrdersRes] = await Promise.all([
    quoteService.fetchQuotes(1),
    fetchAllWorkOrders(1),
  ]);

  const quotes: DocQuote[] = quotesRes.data.map((q) => ({
    id: q.id,
    number: q.number,
    status: q.status,
    title: q.title,
    customer: { name: q.customer.name },
    created_at: q.created_at,
  }));

  const workOrders: DocWorkOrder[] = workOrdersRes.data.map((w) => ({
    id: w.id,
    number: w.number,
    title: w.title,
    status: w.status,
    customer: { name: w.customer.name },
    finished_at: w.finished_at,
  }));

  return <DocumentosContent quotes={quotes} workOrders={workOrders} />;
}
