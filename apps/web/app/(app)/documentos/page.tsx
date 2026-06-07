import { quoteService } from '../../../lib/quote.service';
import { fetchAllWorkOrders } from '../../../lib/work-order.service';
import { DocumentosContent, type DocQuote, type DocWorkOrder } from './DocumentosContent';

export default async function DocumentosPage(): Promise<JSX.Element> {
  let quotes: DocQuote[] = [];
  let workOrders: DocWorkOrder[] = [];

  try {
    const res = await quoteService.fetchQuotes(1);
    quotes = res.data.map(q => ({
      id: q.id,
      number: q.number,
      status: q.status,
      title: q.title,
      customer: { name: q.customer.name },
      created_at: q.created_at,
    }));
  } catch {}

  try {
    const res = await fetchAllWorkOrders(1);
    workOrders = res.data.map(w => ({
      id: w.id,
      number: w.number,
      title: w.title,
      status: w.status,
      customer: { name: w.customer.name },
      finished_at: w.finished_at,
    }));
  } catch {}

  return <DocumentosContent quotes={quotes} workOrders={workOrders} />;
}
