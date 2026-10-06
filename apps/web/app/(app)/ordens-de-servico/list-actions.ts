'use server';

import { fetchAllWorkOrders, type WorkOrder } from '../../../lib/work-order.service';

/** Next page of the work-order list ("Ver mais"); null when the request fails. */
export async function loadWorkOrdersPage(page: number): Promise<WorkOrder[] | null> {
  try {
    return (await fetchAllWorkOrders(page)).data ?? [];
  } catch {
    return null;
  }
}
