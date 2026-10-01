import { fetchAllWorkOrders } from '../../../lib/work-order.service';
import { OSContent } from './OSContent';

export default async function OrdensDeServicoPage(): Promise<JSX.Element> {
  const result = await fetchAllWorkOrders(1);
  return <OSContent orders={result.data ?? []} />;
}
