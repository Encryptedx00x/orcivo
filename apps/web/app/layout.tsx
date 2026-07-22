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

const jetBrainsMono = localFont({
  src: [
    { path: '../../backend/src/quote/fonts/JetBrainsMono-Regular.ttf', weight: '400', style: 'normal' },
    { path: '../../backend/src/quote/fonts/JetBrainsMono-Medium.ttf', weight: '500', style: 'normal' },
    { path: '../../backend/src/quote/fonts/JetBrainsMono-SemiBold.ttf', weight: '600', style: 'normal' },
  ],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Orcivo',
  description: 'Para técnicos que constroem negócios',
};

export default function RootLayout({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <html lang="pt-BR">
      <body className={`${inter.variable} ${jetBrainsMono.variable} bg-white text-[#0A0A0F] antialiased`}>
        {children}
      </body>
    </html>
  );
}
