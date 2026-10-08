import type { ComponentType } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  DOC_PAGES,
  type DocPage,
  getDocBySlug,
  getDocBySlugRelated,
  getDocNavigation,
  getDocTrack,
} from '@/lib/docs';
import { DOC_ICON_MAP } from '../docIcons';
import { ArrowRight, Check, ChevronLeft, ChevronRight, Lightbulb, ListChecks } from 'lucide-react';
import MermaidDiagram from '@/components/MermaidDiagram';
import SystemArchitectureDoc from '@/components/docs/SystemArchitectureDoc';
import DocCallout from '@/components/docs/DocCallout';
import DocTableOfContents, { type DocTocItem } from '@/components/docs/DocTableOfContents';
import CopyButton from '@/components/CopyButton';
import { pageMetadata } from '@/lib/seo';

/**
 * Pages whose body is hand-written instead of generated from DocPage data.
 * They keep the shared header and related links, and get a wider column for
 * their diagrams.
 */
const CUSTOM_BODIES: Record<string, ComponentType> = {
  architecture: SystemArchitectureDoc,
};

function sectionId(heading: string, index: number) {
  const slug = heading
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `doc-section-${index + 1}-${slug || 'section'}`;
}

export function generateStaticParams() {
  return DOC_PAGES.map((doc) => ({ slug: doc.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const doc = getDocBySlug(slug);
  if (!doc) return { title: 'Documentation — ReachConvert' };
  return pageMetadata({
    title: doc.seoTitle ?? `${doc.title.split(' — ')[0]} — ReachConvert Docs`,
    description: doc.tagline,
    path: `/documentation/${doc.slug}`,
  });
}

export default async function DocPageView({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const doc = getDocBySlug(slug);
  if (!doc) notFound();
  const track = getDocTrack(doc);

  const Icon = DOC_ICON_MAP[doc.icon];
  const related = getDocBySlugRelated(slug);
  const navigation = getDocNavigation(slug);
  const CustomBody = CUSTOM_BODIES[doc.slug];
  const tocItems: DocTocItem[] = doc.sections.map((section, index) => ({
    id: sectionId(section.heading, index),
    label: section.heading,
  }));

  return (
    <article className="mx-auto max-w-5xl">
      {/* Header */}
      <div className="border-b border-zinc-900 pb-8">
        <nav className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-600" aria-label="Breadcrumb">
          <Link href="/documentation" className="transition-colors hover:text-zinc-300">Docs</Link>
          <span aria-hidden="true">/</span>
          <span className="text-indigo-400">{track}</span>
          <span aria-hidden="true">/</span>
          <span>{doc.category}</span>
        </nav>
        <div className="mt-4 flex items-start gap-4">
          <div className="flex h-14 w-14 flex-none items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 shadow-lg shadow-indigo-500/20">
            <Icon className="h-7 w-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              {doc.title.split(' — ')[0]}
            </h1>
            <p className="mt-2 text-base text-zinc-400">{doc.tagline}</p>
            {(doc.audience || doc.prerequisites?.length || doc.lastReviewed) && (
              <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-zinc-500">
                {doc.audience && <span><strong className="font-semibold text-zinc-400">Audience:</strong> {doc.audience}</span>}
                {doc.lastReviewed && <span><strong className="font-semibold text-zinc-400">Reviewed:</strong> {doc.lastReviewed}</span>}
              </div>
            )}
          </div>
        </div>
      </div>

      {CustomBody ? (
        <CustomBody />
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-12 xl:grid-cols-[minmax(0,1fr)_12rem]">
          <div className="min-w-0">
            <DataBody doc={doc} />
          </div>
          <DocTableOfContents items={tocItems} />
        </div>
      )}

      {/* Related */}
      {related.length > 0 && (
        <div className="mt-12 border-t border-zinc-900 pt-8">
          <h2 className="mb-4 text-xs font-bold uppercase tracking-[0.28em] text-zinc-500">Related</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {related.map((r) => {
              const RIcon = DOC_ICON_MAP[r.icon];
              return (
                <Link
                  key={r.slug}
                  href={`/documentation/${r.slug}`}
                  className="group flex items-center gap-3 rounded-xl border border-zinc-850 bg-zinc-900/40 px-4 py-3 transition-colors hover:border-zinc-700 hover:bg-zinc-900/70"
                >
                  <RIcon className="h-4 w-4 flex-none text-indigo-400" />
                  <span className="flex-1 truncate text-sm font-semibold text-zinc-200">
                    {r.title.split(' — ')[0]}
                  </span>
                  <ArrowRight className="h-4 w-4 text-zinc-600 transition-all group-hover:translate-x-0.5 group-hover:text-indigo-400" />
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {(navigation.previous || navigation.next) && (
        <nav className="mt-10 grid grid-cols-1 gap-3 border-t border-zinc-900 pt-8 sm:grid-cols-2" aria-label="Documentation pagination">
          {navigation.previous ? (
            <Link
              href={`/documentation/${navigation.previous.slug}`}
              className="group rounded-xl border border-zinc-850 bg-zinc-900/30 p-4 transition-colors hover:border-zinc-700 hover:bg-zinc-900/70"
            >
              <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-600">
                <ChevronLeft className="h-3.5 w-3.5" /> Previous
              </span>
              <span className="mt-2 block truncate text-sm font-semibold text-zinc-200 group-hover:text-white">
                {navigation.previous.title.split(' — ')[0]}
              </span>
            </Link>
          ) : <div />}
          {navigation.next && (
            <Link
              href={`/documentation/${navigation.next.slug}`}
              className="group rounded-xl border border-zinc-850 bg-zinc-900/30 p-4 text-left transition-colors hover:border-zinc-700 hover:bg-zinc-900/70 sm:text-right"
            >
              <span className="flex items-center justify-end gap-1 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-600">
                Next <ChevronRight className="h-3.5 w-3.5" />
              </span>
              <span className="mt-2 block truncate text-sm font-semibold text-zinc-200 group-hover:text-white">
                {navigation.next.title.split(' — ')[0]}
              </span>
            </Link>
          )}
        </nav>
      )}
    </article>
  );
}

/** Intro, sections and tips generated from a DocPage entry in src/lib/docs.ts. */
function DataBody({ doc }: { doc: DocPage }) {
  return (
    <>
      {/* Intro */}
      <div className="space-y-4">
        {doc.intro.map((p, i) => (
          <p key={i} className="text-base leading-7 text-zinc-300">
            {p}
          </p>
        ))}
      </div>

      {doc.prerequisites && doc.prerequisites.length > 0 && (
        <div className="mt-6 rounded-2xl border border-zinc-850 bg-zinc-900/40 p-5">
          <h2 className="text-sm font-bold text-white">Before you begin</h2>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-zinc-400">
            {doc.prerequisites.map((prerequisite) => (
              <li key={prerequisite} className="flex gap-2.5">
                <Check className="mt-1 h-3.5 w-3.5 flex-none text-emerald-400" />
                <span>{prerequisite}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Sections */}
      <div className="mt-10 space-y-12">
        {doc.sections.map((section, index) => (
          <section key={section.heading} id={sectionId(section.heading, index)} className="scroll-mt-24">
            <h2 className="text-xl font-bold tracking-tight text-white">{section.heading}</h2>

            {section.body?.map((p, i) => (
              <p key={i} className="mt-3 text-base leading-7 text-zinc-300">
                {p}
              </p>
            ))}

            {section.capabilities && (
              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {section.capabilities.map((cap) => (
                  <div
                    key={cap.title}
                    className="rounded-2xl border border-zinc-850 bg-zinc-900/40 p-4"
                  >
                    <p className="text-sm font-bold text-white">{cap.title}</p>
                    <p className="mt-1 text-sm leading-6 text-zinc-400">{cap.text}</p>
                  </div>
                ))}
              </div>
            )}

            {section.steps && (
              <ol className="mt-5 space-y-3">
                {section.steps.map((step, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-indigo-500/15 text-xs font-bold text-indigo-400">
                      {i + 1}
                    </span>
                    <span className="text-sm leading-6 text-zinc-300">{step}</span>
                  </li>
                ))}
              </ol>
            )}

            {section.code && (
              <div className="mt-5 overflow-hidden rounded-2xl border border-zinc-850 bg-zinc-950">
                <div className="flex items-center justify-between gap-3 border-b border-zinc-850 px-4 py-2">
                  <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                    <ListChecks className="h-3.5 w-3.5" /> {section.code.caption ?? 'Example'}
                  </div>
                  <CopyButton
                    value={section.code.lines.join('\n')}
                    label="Copy"
                    className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-semibold text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
                  />
                </div>
                <pre className="overflow-x-auto px-4 py-4 text-xs leading-6 text-zinc-300"><code>{section.code.lines.join('\n')}</code></pre>
              </div>
            )}

            {section.callouts?.map((callout) => (
              <DocCallout key={`${section.heading}-${callout.title}`} callout={callout} />
            ))}

            {section.diagram && (
              <MermaidDiagram
                caption={section.diagram.caption}
                chart={section.diagram.chart}
              />
            )}
          </section>
        ))}
      </div>

      {/* Tips */}
      {doc.tips && doc.tips.length > 0 && (
        <div className="mt-12 rounded-2xl border border-indigo-500/20 bg-gradient-to-tr from-indigo-500/10 to-purple-500/5 p-6">
          <h2 className="flex items-center gap-2 text-sm font-bold text-white">
            <Lightbulb className="h-4 w-4 text-amber-400" /> Tips
          </h2>
          <ul className="mt-4 space-y-2.5">
            {doc.tips.map((tip, i) => (
              <li key={i} className="flex gap-2.5 text-sm leading-6 text-zinc-300">
                <Check className="mt-0.5 h-4 w-4 flex-none text-emerald-400" />
                {tip}
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
