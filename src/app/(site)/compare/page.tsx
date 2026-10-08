import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Check, CircleMinus, Layers, Scale } from 'lucide-react';
import Reveal from '@/components/Reveal';
import { pageMetadata } from '@/lib/seo';
import { REPOS } from '@/lib/site';

export const metadata: Metadata = pageMetadata({
  title: 'ReachConvert vs. a Multi-Tool Outreach Stack — Open-Source Alternative',
  description:
    'Compare ReachConvert with the usual stack of a cold email tool, an AI voice agent platform, and a sales intent tool. See what one open-source workspace replaces, and where it does not fit.',
  path: '/compare',
});

// Compared by tool category, not by named product, so the page stays accurate
// as other vendors change their features and pricing.
const ROWS = [
  {
    need: 'Personalized bulk email',
    reach: 'MailReach sends through your own Amazon SES account, with merge fields from any contact column and AI-written templates.',
    stack: 'A dedicated cold email tool, usually priced per seat or per connected mailbox.',
  },
  {
    need: 'AI voice calling',
    reach: 'VoiceReach agents hold live conversations through Twilio and Gemini Live, with transcripts and recordings.',
    stack: 'A separate AI voice agent platform, with its own contact list and its own reporting.',
  },
  {
    need: 'Buying signals',
    reach: 'Signals watches imported companies for funding, hiring, launches, and news, and playbooks trigger outreach automatically.',
    stack: 'An intent or alerts tool, plus manual work or glue code to turn alerts into sends.',
  },
  {
    need: 'Contacts and segments',
    reach: 'One contact directory shared by email, calling, and signals.',
    stack: 'Contacts copied between tools by CSV export, which drifts out of sync.',
  },
  {
    need: 'Analytics',
    reach: 'One dashboard covering email delivery, opens, replies, and call outcomes.',
    stack: 'A report per tool, combined by hand in a spreadsheet.',
  },
  {
    need: 'Cost model',
    reach: 'Free and open source (AGPL-3.0). You pay Twilio, AWS, and Google directly for what you use.',
    stack: 'Several subscriptions, often with per-seat pricing and usage limits.',
  },
  {
    need: 'Data ownership',
    reach: 'Self-host it and your contacts, templates, and call recordings stay in your own database.',
    stack: 'Data spread across several vendors’ clouds.',
  },
];

const GOOD_FIT = [
  'You want email and AI calling in one place without paying for several tools.',
  'You are comfortable creating Twilio, AWS SES, and Gemini accounts and pasting in API keys.',
  'You want to self-host, read the code, or change how it works.',
  'You target a defined list of companies and want to reach out when something changes there.',
];

const NOT_A_FIT = [
  'You need a built-in database of leads to search and buy. ReachConvert works with contacts you import.',
  'You want a fully managed service with no provider accounts to set up.',
  'You need an enterprise CRM, or a vendor with a support contract and SLA.',
];

const FAQ = [
  {
    q: 'Is ReachConvert really free?',
    a: 'Yes. The software is free and open source under the AGPL-3.0. Sending email and placing calls uses your own Amazon SES, Twilio, and Gemini accounts, which bill you directly for what you use.',
  },
  {
    q: 'Can I self-host ReachConvert?',
    a: 'Yes. It is a Next.js frontend and a NestJS backend with MongoDB. The contribute page has the local setup steps, and both repositories are on GitHub.',
  },
  {
    q: 'Do I need all three providers?',
    a: 'No. Connect only the channel you need. Email needs Amazon SES, and AI calling needs Twilio and a Gemini API key.',
  },
  {
    q: 'Is AI cold calling legal?',
    a: 'It depends on where you call. Many countries require prior consent for automated or AI-voiced calls and run do-not-call registries. Read the AI calling guide, and check the rules for your region before launching.',
  },
];

export default function ComparePage() {
  return (
    <div className="px-5 pb-24 pt-16 sm:px-8 sm:pt-24">
      {/* ---------------- Hero ---------------- */}
      <section className="mx-auto w-full max-w-3xl text-center">
        <Reveal>
          <p className="sig-label text-indigo-400">[ COMPARE ]</p>
          <h1 className="sig-display mt-4 text-4xl font-extrabold leading-[1.05] text-white sm:text-6xl">
            One workspace instead of four tools
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-zinc-400 sm:text-lg">
            Outreach teams usually combine a cold email tool, an AI voice agent platform, an intent
            data tool, and a spreadsheet. Here is how ReachConvert compares, and when another option
            is the better choice.
          </p>
        </Reveal>
      </section>

      {/* ---------------- Comparison ---------------- */}
      <section className="mx-auto mt-14 w-full max-w-5xl">
        <div className="sig-label hidden grid-cols-[1fr_1.4fr_1.4fr] gap-5 px-5 pb-3 text-zinc-500 md:grid">
          <span>What you need</span>
          <span className="text-indigo-400">ReachConvert</span>
          <span>Typical multi-tool stack</span>
        </div>
        <div className="space-y-3">
          {ROWS.map((row, i) => (
            <Reveal key={row.need} delay={(i % 3) * 60}>
              <div className="sig-card grid grid-cols-1 gap-3 p-5 md:grid-cols-[1fr_1.4fr_1.4fr] md:gap-5">
                <h2 className="text-base font-bold text-white">{row.need}</h2>
                <div className="flex gap-2.5">
                  <Check className="mt-1 h-4 w-4 flex-none text-emerald-400" />
                  <p className="text-sm leading-6 text-zinc-300">
                    <span className="sig-label mr-1.5 text-indigo-400 md:hidden">ReachConvert:</span>
                    {row.reach}
                  </p>
                </div>
                <div className="flex gap-2.5">
                  <Layers className="mt-1 h-4 w-4 flex-none text-zinc-600" />
                  <p className="text-sm leading-6 text-zinc-400">
                    <span className="sig-label mr-1.5 text-zinc-500 md:hidden">Typical stack:</span>
                    {row.stack}
                  </p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ---------------- Fit ---------------- */}
      <section className="mx-auto mt-20 grid w-full max-w-5xl grid-cols-1 gap-5 md:grid-cols-2">
        <Reveal className="h-full">
          <div className="sig-card sig-ticks sig-ticks-on h-full p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400">
                <Scale className="h-5 w-5" />
              </div>
              <h2 className="text-base font-bold text-white">ReachConvert is a good fit if</h2>
            </div>
            <ul className="mt-5 space-y-3">
              {GOOD_FIT.map((item) => (
                <li key={item} className="flex gap-2.5 text-sm leading-6 text-zinc-300">
                  <Check className="mt-1 h-4 w-4 flex-none text-emerald-400" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
        <Reveal delay={90} className="h-full">
          <div className="sig-card h-full p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-800/60 text-zinc-400">
                <CircleMinus className="h-5 w-5" />
              </div>
              <h2 className="text-base font-bold text-white">Choose something else if</h2>
            </div>
            <ul className="mt-5 space-y-3">
              {NOT_A_FIT.map((item) => (
                <li key={item} className="flex gap-2.5 text-sm leading-6 text-zinc-400">
                  <CircleMinus className="mt-1 h-4 w-4 flex-none text-zinc-600" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      </section>

      {/* ---------------- FAQ ---------------- */}
      <section className="mx-auto mt-20 w-full max-w-3xl">
        <Reveal>
          <p className="sig-label text-indigo-400">[ FAQ ]</p>
          <h2 className="sig-display mt-3 text-2xl font-extrabold text-white sm:text-3xl">
            Common questions
          </h2>
        </Reveal>
        <div className="mt-6 space-y-3">
          {FAQ.map((item) => (
            <Reveal key={item.q}>
              <div className="sig-card p-5">
                <h3 className="text-base font-bold text-white">{item.q}</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-400">{item.a}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ---------------- CTA ---------------- */}
      <Reveal>
        <div className="mx-auto mt-16 flex max-w-xl flex-col justify-center gap-3 sm:flex-row">
          <span className="sig-btn-wrap justify-center">
            <Link href="/login" className="sig-btn group w-full sm:w-auto">
              Start free
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </span>
          <Link href="/documentation/automate-cold-calls-with-ai" className="sig-btn-ghost justify-center">
            Read the AI calling guide
          </Link>
          <a
            href={REPOS.frontend.url}
            target="_blank"
            rel="noopener noreferrer"
            className="sig-btn-ghost justify-center"
          >
            View on GitHub
          </a>
        </div>
      </Reveal>
    </div>
  );
}
