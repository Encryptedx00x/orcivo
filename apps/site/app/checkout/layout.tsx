import { pageMetadata } from '../seo';

export const metadata = pageMetadata(
  'Continue sua assinatura | Orcivo',
  'Continue para criar sua conta e contratar o plano Orcivo escolhido com segurança no aplicativo.',
  '/checkout',
  false,
);

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
