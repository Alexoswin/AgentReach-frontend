import type { Metadata } from 'next';
import SEOFeaturePage from '@/components/SEOFeaturePage';
import { pageMetadata } from '@/lib/seo';
import { SEO_PAGES } from '@/lib/seo-pages';

export const metadata: Metadata = pageMetadata({
  title: 'AI Outreach Automation for Email and Phone Campaigns — ReachConvert',
  description: 'Coordinate personalized email, AI calling agents, signals, contact segments, and analytics in one open-source outreach platform.',
  path: '/outreach-automation',
});

export default function OutreachAutomationPage() {
  return <SEOFeaturePage data={SEO_PAGES.outreachAutomation} />;
}
