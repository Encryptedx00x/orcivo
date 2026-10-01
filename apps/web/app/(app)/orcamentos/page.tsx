import { quoteService } from '../../../lib/quote.service';
import { OrcamentosContent } from './OrcamentosContent';

export default async function OrcamentosPage(): Promise<JSX.Element> {
  const result = await quoteService.fetchQuotes(1);
  return <OrcamentosContent quotes={result.data} />;
}
