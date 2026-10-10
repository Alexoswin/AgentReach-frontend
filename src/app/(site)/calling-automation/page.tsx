import type { Metadata } from 'next';
import SEOFeaturePage from '@/components/SEOFeaturePage';
import { pageMetadata } from '@/lib/seo';
import { SEO_PAGES } from '@/lib/seo-pages';

export const metadata: Metadata = pageMetadata({
  title: 'Calling Automation Software for Outbound Sales — ReachConvert',
  description: 'Automate outbound call scheduling, campaigns, AI agents, call tracking, and follow-up review with ReachConvert.',
  path: '/calling-automation',
});

export default function CallingAutomationPage() {
  return <SEOFeaturePage data={SEO_PAGES.callingAutomation} />;
}
