import Link from 'next/link';
import { ArrowRight, Check, CircleHelp, Workflow } from 'lucide-react';
import { SITE_NAME, SITE_URL } from '@/lib/site';

export type SEOFeaturePageData = {
  path: string;
  eyebrow: string;
  title: string;
  intro: string;
  description: string;
  benefits: { title: string; text: string }[];
  steps: { title: string; text: string }[];
  useCases: string[];
  faqs: { question: string; answer: string }[];
  related: { label: string; href: string }[];
};

export default function SEOFeaturePage({ data }: { data: SEOFeaturePageData }) {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: data.title,
    url: `${SITE_URL}${data.path}`,
    description: data.description,
    isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: SITE_URL },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <article className="px-5 py-16 sm:px-8 sm:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-4xl">
            <p className="sig-label text-indigo-400">[ {data.eyebrow} ]</p>
            <h1 className="sig-display mt-5 text-4xl font-extrabold leading-[1.04] text-white sm:text-6xl">
              {data.title}
            </h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-zinc-300">{data.intro}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/login" className="sig-btn group justify-center">
                Start free <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link href="/documentation" className="sig-btn-ghost justify-center">
                Read the documentation
              </Link>
            </div>
          </div>

          <section className="mt-20 grid gap-5 md:grid-cols-3" aria-labelledby="benefits-heading">
            <div className="md:col-span-3">
              <p className="sig-label text-indigo-400">[ WHY REACHCONVERT ]</p>
              <h2 id="benefits-heading" className="sig-display mt-3 text-3xl font-extrabold text-white sm:text-4xl">
                {data.description}
              </h2>
            </div>
            {data.benefits.map((benefit) => (
              <div key={benefit.title} className="sig-card sig-ticks p-6">
                <Check className="h-5 w-5 text-emerald-400" />
                <h3 className="sig-display mt-5 text-xl font-bold text-white">{benefit.title}</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-400">{benefit.text}</p>
              </div>
            ))}
          </section>

          <section className="mt-24 grid gap-12 lg:grid-cols-[0.8fr_1.2fr]" aria-labelledby="steps-heading">
            <div>
              <p className="sig-label text-indigo-400">[ HOW IT WORKS ]</p>
              <h2 id="steps-heading" className="sig-display mt-3 text-3xl font-extrabold text-white sm:text-4xl">
                Build an outreach workflow that runs with your team
              </h2>
              <p className="mt-4 text-base leading-7 text-zinc-400">
                Import contacts, configure your message, and monitor every email or call from one workspace.
              </p>
            </div>
            <div className="space-y-4">
              {data.steps.map((step, index) => (
                <div key={step.title} className="sig-card flex gap-4 p-5">
                  <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-indigo-500/15 font-mono text-sm font-bold text-indigo-300">
                    0{index + 1}
                  </span>
                  <div>
                    <h3 className="text-base font-bold text-white">{step.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-zinc-400">{step.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-24" aria-labelledby="use-cases-heading">
            <div className="flex items-center gap-3">
              <Workflow className="h-5 w-5 text-indigo-400" />
              <h2 id="use-cases-heading" className="sig-display text-2xl font-extrabold text-white sm:text-3xl">
                Common use cases
              </h2>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {data.useCases.map((useCase) => (
                <div key={useCase} className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 text-sm text-zinc-300">
                  {useCase}
                </div>
              ))}
            </div>
          </section>

          <section className="mt-24 max-w-4xl" aria-labelledby="faq-heading">
            <div className="flex items-center gap-3">
              <CircleHelp className="h-5 w-5 text-indigo-400" />
              <h2 id="faq-heading" className="sig-display text-2xl font-extrabold text-white sm:text-3xl">
                Frequently asked questions
              </h2>
            </div>
            <div className="mt-6 divide-y divide-zinc-800 rounded-2xl border border-zinc-800 bg-zinc-900/30 px-5">
              {data.faqs.map((faq) => (
                <details key={faq.question} className="group py-5">
                  <summary className="cursor-pointer list-none pr-8 font-semibold text-white marker:hidden">
                    {faq.question}
                  </summary>
                  <p className="mt-3 text-sm leading-6 text-zinc-400">{faq.answer}</p>
                </details>
              ))}
            </div>
          </section>

          <nav className="mt-20 border-t border-zinc-800 pt-8" aria-label="Related pages">
            <p className="sig-label text-zinc-500">RELATED REACHCONVERT PAGES</p>
            <div className="mt-4 flex flex-wrap gap-3">
              {data.related.map((link) => (
                <Link key={link.href} href={link.href} className="sig-btn-ghost">
                  {link.label} <ArrowRight className="h-4 w-4" />
                </Link>
              ))}
            </div>
          </nav>
        </div>
      </article>
    </>
  );
}
