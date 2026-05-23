import { notFound } from 'next/navigation';
import { quoteService } from '../../../../lib/quote.service';
import OrcamentoDetail from './OrcamentoDetail';

interface Props {
  params: { id: string };
}

export default async function OrcamentoDetailPage({ params }: Props): Promise<JSX.Element> {
  let quote;
  try {
    quote = await quoteService.fetchQuote(params.id);
  } catch {
    notFound();
  }

  return <OrcamentoDetail quote={quote} />;
}
