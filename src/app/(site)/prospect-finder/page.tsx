import type { Metadata } from 'next';
import SEOFeaturePage from '@/components/SEOFeaturePage';
import { pageMetadata } from '@/lib/seo';
import { SEO_PAGES } from '@/lib/seo-pages';

export const metadata: Metadata = pageMetadata({
  title: 'Prospect Finder: Find Leads That Match Your Ideal Customer — ReachConvert',
  description: 'Describe your ideal customer and find matching companies and people, each checked against its own website, then add them to your outreach contacts.',
  path: '/prospect-finder',
});

export default function ProspectFinderPage() {
  return <SEOFeaturePage data={SEO_PAGES.prospectFinder} />;
}
