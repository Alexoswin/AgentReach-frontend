import type { MetadataRoute } from 'next';
import { DOC_PAGES } from '@/lib/docs';
import { SITE_URL } from '@/lib/site';

/** Public, indexable routes. Signed-in app pages are noindex and stay out. */
const STATIC_ROUTES: { path: string; priority: number }[] = [
  { path: '/', priority: 1 },
  { path: '/compare', priority: 0.8 },
  { path: '/documentation', priority: 0.8 },
  { path: '/contribute', priority: 0.5 },
  { path: '/contact', priority: 0.4 },
  { path: '/support', priority: 0.4 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    ...STATIC_ROUTES.map(({ path, priority }) => ({
      url: `${SITE_URL}${path === '/' ? '' : path}`,
      priority,
    })),
    ...DOC_PAGES.map((doc) => ({
      url: `${SITE_URL}/documentation/${doc.slug}`,
      priority: doc.category === 'Guides' ? 0.7 : 0.6,
    })),
  ];
}
