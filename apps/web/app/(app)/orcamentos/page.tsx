import type { PlanUsageResponse } from '@orcivo/shared-types';
import { apiFetch } from '../../../lib/api';
import { quoteService } from '../../../lib/quote.service';
import { OrcamentosContent } from './OrcamentosContent';

export default async function OrcamentosPage(): Promise<React.JSX.Element> {
  const [result, usage] = await Promise.all([
    quoteService.fetchQuotes(1),
    apiFetch<PlanUsageResponse>('/company/me/usage'),
  ]);
  return (
    <OrcamentosContent
      quotes={result.data}
      usage={usage.resources.find((resource) => resource.code === 'QUOTES_MONTH')}
    />
  );
}
