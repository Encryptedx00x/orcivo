import type { PlanUsageResponse } from '@orcivo/shared-types';
import { apiFetch } from '../../../lib/api';
import { fetchAllWorkOrders } from '../../../lib/work-order.service';
import { OSContent } from './OSContent';

export default async function OrdensDeServicoPage(): Promise<React.JSX.Element> {
  const [result, usage] = await Promise.all([
    fetchAllWorkOrders(1),
    apiFetch<PlanUsageResponse>('/company/me/usage'),
  ]);
  return (
    <OSContent
      orders={result.data ?? []}
      usage={usage.resources.find((resource) => resource.code === 'WORK_ORDERS_MONTH')}
    />
  );
}
