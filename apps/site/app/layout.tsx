import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Orcivo — Gestão para técnicos instaladores',
  description: 'Orçamentos, OS, PDF e aprovação pelo WhatsApp — tudo no celular.',
  openGraph: {
    title: 'Orcivo — Gestão para técnicos instaladores',
    description: 'Orçamentos, OS, PDF e aprovação pelo WhatsApp — tudo no celular.',
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
