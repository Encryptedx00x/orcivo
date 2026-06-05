import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Orcivo â€” GestÃ£o para tÃ©cnicos instaladores',
  description: 'OrÃ§amentos, OS, PDF e aprovaÃ§Ã£o pelo WhatsApp â€” tudo no celular.',
  openGraph: {
    title: 'Orcivo â€” GestÃ£o para tÃ©cnicos instaladores',
    description: 'OrÃ§amentos, OS, PDF e aprovaÃ§Ã£o pelo WhatsApp â€” tudo no celular.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>{children}</body>
    </html>
  );
}

