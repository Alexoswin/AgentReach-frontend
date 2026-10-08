import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

// App pages are kept out of results with a noindex tag rather than Disallow,
// since crawlers must be able to fetch a page to see its noindex.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: '/api/' },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
