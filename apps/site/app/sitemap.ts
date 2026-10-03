import type { MetadataRoute } from 'next';
import { SITE_URL } from './seo';

export default function sitemap(): MetadataRoute.Sitemap {
  // Transactional checkout routes carry noindex and are not search destinations.
  return ['/', '/planos', '/termos', '/privacidade'].map((path) => ({
    url: new URL(path, SITE_URL).toString(),
  }));
}
