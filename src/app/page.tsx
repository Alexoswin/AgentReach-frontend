import type { Metadata } from 'next';
import LandingPage from './LandingPage';
import { pageMetadata } from '@/lib/seo';
import { REPOS, SITE_DESCRIPTION, SITE_NAME, SITE_URL } from '@/lib/site';

// The landing UI is a client component, so its metadata lives in this server wrapper.
export const metadata: Metadata = pageMetadata({
  title: 'ReachConvert — AI Cold Calling Agents & Personalized Bulk Email',
  description: SITE_DESCRIPTION,
  path: '/',
});

/** schema.org data so search engines can show ReachConvert as a software product. */
const STRUCTURED_DATA = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: SITE_NAME,
  url: SITE_URL,
  description: SITE_DESCRIPTION,
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  sameAs: [REPOS.frontend.url, REPOS.backend.url],
};

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(STRUCTURED_DATA) }}
      />
      <LandingPage />
    </>
  );
}
