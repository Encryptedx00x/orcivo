import { pageMetadata } from '../seo';

export const metadata = pageMetadata(
  'Planos e preços | Orcivo',
  'Compare os planos Orcivo Livre, Orcivo Solo, Orcivo Mais e Orcivo Equipe e escolha o ideal para seu negócio.',
  '/planos',
  true,
);

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
