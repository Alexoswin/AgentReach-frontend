import type { Metadata } from 'next';
import { SITE_NAME } from '@/lib/site';

/** Served by src/app/opengraph-image.tsx. */
const SHARE_IMAGE = { url: '/opengraph-image', width: 1200, height: 630, alt: `${SITE_NAME} — AI outreach platform` };

/**
 * Metadata for a public, indexable page: title, description, canonical URL,
 * and matching Open Graph / Twitter fields. Next.js replaces (not merges) a
 * parent's openGraph object, and a page that sets its own also loses the
 * root opengraph-image, so the image is passed explicitly.
 */
export function pageMetadata({
  title,
  description,
  path,
}: {
  title: string;
  description: string;
  /** Path relative to SITE_URL, e.g. '/contact'. */
  path: string;
}): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { type: 'website', siteName: SITE_NAME, url: path, title, description, images: [SHARE_IMAGE] },
    twitter: { card: 'summary_large_image', title, description, images: [SHARE_IMAGE.url] },
  };
}

/** For signed-in and auth pages, which have no value in search results. */
export const NO_INDEX: Metadata = { robots: { index: false, follow: false } };
