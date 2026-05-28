import { quoteService, Quote } from '../../../lib/quote.service';
import { OrcamentosContent } from './OrcamentosContent';

export default async function OrcamentosPage(): Promise<JSX.Element> {
  let quotes: Quote[] = [];
  try {
    const result = await quoteService.fetchQuotes(1);
    quotes = result.data;
  } catch {}
  return <OrcamentosContent quotes={quotes} />;
}
