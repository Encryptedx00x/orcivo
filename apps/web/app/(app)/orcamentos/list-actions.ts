'use server';

import { quoteService, type Quote } from '../../../lib/quote.service';

/** Next page of the quote list ("Ver mais"); null when the request fails. */
export async function loadQuotesPage(page: number): Promise<Quote[] | null> {
  try {
    return (await quoteService.fetchQuotes(page)).data;
  } catch {
    return null;
  }
}
