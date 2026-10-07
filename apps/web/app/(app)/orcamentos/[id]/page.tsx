import { notFound } from 'next/navigation';
import { quoteService } from '../../../../lib/quote.service';
import OrcamentoDetail from './OrcamentoDetail';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function OrcamentoDetailPage(props: Props): Promise<React.JSX.Element> {
  const params = await props.params;
  let quote;
  try {
    quote = await quoteService.fetchQuote(params.id);
  } catch {
    notFound();
  }

  return <OrcamentoDetail quote={quote} />;
}
