import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import { Footer } from './components/Footer';
import { SITE_URL } from './seo';

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
  metadataBase: new URL(SITE_URL),
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '16x16 32x32 48x48' },
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  manifest: '/manifest.webmanifest',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className={inter.variable}>
        {children}
        <Footer />
      </body>
    </html>
  );
}
