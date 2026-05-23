import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Orcivo',
  description: 'Para técnicos que constroem negócios',
};

export default function RootLayout({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <html lang="pt-BR">
      <body className="bg-white text-[#0A0A0F] antialiased">{children}</body>
    </html>
  );
}
