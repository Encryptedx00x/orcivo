import { fetchAllWorkOrders, WorkOrder } from '../../../lib/work-order.service';
import { OSContent } from './OSContent';

export default async function OrdensDeServicoPage(): Promise<JSX.Element> {
  let orders: WorkOrder[] = [];
  try {
    const result = await fetchAllWorkOrders(1);
    orders = result.data ?? [];
  } catch {}
  return <OSContent orders={orders} />;
}
