import type { Metadata } from 'next';

export const SITE_URL = 'https://orcivo.com.br';

export function pageMetadata(
  title: string,
  description: string,
  path: string,
  index = true,
): Metadata {
  const url = new URL(path, SITE_URL).toString();
  const images = [{
    url: `${SITE_URL}/og-image.png`,
    width: 1200,
    height: 630,
    alt: 'Orcivo — Do orçamento à aprovação, tudo pelo celular.',
  }];

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, siteName: 'Orcivo', locale: 'pt_BR', type: 'website', images },
    twitter: { card: 'summary_large_image', title, description, images },
    robots: { index, follow: true },
  };
}
