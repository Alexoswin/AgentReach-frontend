import type { Metadata } from 'next';
import SEOFeaturePage from '@/components/SEOFeaturePage';
import { pageMetadata } from '@/lib/seo';
import { SEO_PAGES } from '@/lib/seo-pages';

export const metadata: Metadata = pageMetadata({
  title: 'AI Calling Agents for Sales and Lead Qualification — ReachConvert',
  description: 'Create configurable AI calling agents with voice, knowledge, scripts, and objection handling for repeatable sales conversations.',
  path: '/calling-agents',
});

export default function CallingAgentsPage() {
  return <SEOFeaturePage data={SEO_PAGES.callingAgents} />;
}
