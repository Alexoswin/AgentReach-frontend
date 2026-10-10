import type { Metadata } from 'next';
import SEOFeaturePage from '@/components/SEOFeaturePage';
import { pageMetadata } from '@/lib/seo';
import { SEO_PAGES } from '@/lib/seo-pages';

export const metadata: Metadata = pageMetadata({
  title: 'AI Calling Software for Automated Outbound Calls — ReachConvert',
  description: 'Launch AI voice campaigns that qualify leads, answer questions, and track outbound call outcomes with ReachConvert.',
  path: '/ai-calling',
});

export default function AICallingPage() {
  return <SEOFeaturePage data={SEO_PAGES.aiCalling} />;
}
