import type { Metadata } from 'next';
import SEOFeaturePage from '@/components/SEOFeaturePage';
import { pageMetadata } from '@/lib/seo';
import { SEO_PAGES } from '@/lib/seo-pages';

export const metadata: Metadata = pageMetadata({
  title: 'Email Automation for Personalized Sales Outreach — ReachConvert',
  description: 'Create personalized sales email campaigns with AI-assisted templates, contact segments, scheduling, and analytics.',
  path: '/email-automation',
});

export default function EmailAutomationPage() {
  return <SEOFeaturePage data={SEO_PAGES.emailAutomation} />;
}
