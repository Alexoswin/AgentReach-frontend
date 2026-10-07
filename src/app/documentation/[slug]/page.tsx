import type { ComponentType } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  DOC_PAGES,
  type DocPage,
  getDocBySlug,
  getDocBySlugRelated,
  getDocTrack,
} from '@/lib/docs';
import { DOC_ICON_MAP } from '../docIcons';
import { ArrowRight, Check, Lightbulb, ListChecks } from 'lucide-react';
import MermaidDiagram from '@/components/MermaidDiagram';
import SystemArchitectureDoc from '@/components/docs/SystemArchitectureDoc';

/**
 * Pages whose body is hand-written instead of generated from DocPage data.
 * They keep the shared header and related links, and get a wider column for
 * their diagrams.
 */
const CUSTOM_BODIES: Record<string, ComponentType> = {
  architecture: SystemArchitectureDoc,
};

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
  return {
    title: `${doc.title.split(' — ')[0]} — ReachConvert Docs`,
    description: doc.tagline,
  };
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
  const CustomBody = CUSTOM_BODIES[doc.slug];

  return (
    <article className={`mx-auto ${CustomBody ? 'max-w-5xl' : 'max-w-3xl'}`}>
      {/* Header */}
      <div className="border-b border-zinc-900 pb-8">
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-indigo-400">{track}</p>
          <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-zinc-500">{doc.category}</p>
        </div>
        <div className="mt-4 flex items-start gap-4">
          <div className="flex h-14 w-14 flex-none items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 shadow-lg shadow-indigo-500/20">
            <Icon className="h-7 w-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              {doc.title.split(' — ')[0]}
            </h1>
            <p className="mt-2 text-base text-zinc-400">{doc.tagline}</p>
          </div>
        </div>
      </div>

      {CustomBody ? <CustomBody /> : <DataBody doc={doc} />}

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
    </article>
  );
}

/** Intro, sections and tips generated from a DocPage entry in src/lib/docs.ts. */
function DataBody({ doc }: { doc: DocPage }) {
  return (
    <>
      {/* Intro */}
      <div className="mt-8 space-y-4">
        {doc.intro.map((p, i) => (
          <p key={i} className="text-base leading-7 text-zinc-300">
            {p}
          </p>
        ))}
      </div>

      {/* Sections */}
      <div className="mt-10 space-y-12">
        {doc.sections.map((section) => (
          <section key={section.heading}>
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
                {section.code.caption && (
                  <div className="flex items-center gap-2 border-b border-zinc-850 px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                    <ListChecks className="h-3.5 w-3.5" /> {section.code.caption}
                  </div>
                )}
                <pre className="overflow-x-auto px-4 py-4 text-xs leading-6 text-zinc-300">
                  <code>{section.code.lines.join('\n')}</code>
                </pre>
              </div>
            )}

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
