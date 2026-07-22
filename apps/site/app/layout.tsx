import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';

const inter = localFont({
  src: [
    { path: '../../backend/src/quote/fonts/Inter-Regular.ttf', weight: '400', style: 'normal' },
    { path: '../../backend/src/quote/fonts/Inter-Medium.ttf', weight: '500', style: 'normal' },
    { path: '../../backend/src/quote/fonts/Inter-SemiBold.ttf', weight: '600', style: 'normal' },
    { path: '../../backend/src/quote/fonts/Inter-Bold.ttf', weight: '700', style: 'normal' },
  ],
  variable: '--font-inter',
  display: 'swap',
});

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
      <body className={inter.variable}>{children}</body>
    </html>
  );
}
