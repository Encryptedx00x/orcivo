import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Orcivo — Gestão para técnicos instaladores',
    short_name: 'Orcivo',
    lang: 'pt-BR',
    start_url: '/',
    display: 'browser',
    background_color: '#FFFFFF',
    theme_color: '#6D28D9',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  };
}
