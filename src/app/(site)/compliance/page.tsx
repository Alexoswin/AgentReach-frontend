import type { Metadata } from 'next';
import Link from 'next/link';
import { AlertTriangle, ArrowRight, Check, Mail, PhoneCall, ShieldCheck } from 'lucide-react';
import Reveal from '@/components/Reveal';
import { pageMetadata } from '@/lib/seo';
import { REPOS } from '@/lib/site';

export const metadata: Metadata = pageMetadata({
  title: 'Outreach compliance — ReachConvert',
  description:
    'What ReachConvert does and does not do for consent, opt-outs and call disclosure, and what you need to handle before sending cold email or AI calls.',
  path: '/compliance',
});

// Keep each claim here true of the current code: this page is read as a
// statement of what the product does.
const PROVIDED = [
  {
    title: 'You send from your own accounts',
    body: 'Email goes out through your AWS SES account and verified sender address. Calls are placed from your own Twilio or Plivo number. Your providers see you as the sender.',
  },
  {
    title: 'Each account sees only its own data',
    body: 'Contacts, campaigns, templates, call logs and analytics are visible only to the account that created them.',
  },
  {
    title: 'Provider keys are encrypted at rest',
    body: 'AWS, Twilio, Plivo and Gemini credentials saved in Settings are stored with AES-256-GCM encryption and are never shown back in full.',
  },
  {
    title: 'Every call is logged',
    body: 'Each call keeps its outcome, duration and transcript. Calls placed through Twilio are recorded, and the recording is available from the call log.',
  },
  {
    title: 'You can remove a person at any time',
    body: 'Deleting a contact removes them from your directory, so they are not added to future campaigns.',
  },
];

const NOT_PROVIDED = [
  'No automatic unsubscribe link or List-Unsubscribe header on emails.',
  'No suppression list: opt-outs are not tracked for you, so an imported contact can be emailed again.',
  'No do-not-call list, and no checking of numbers against national registries such as the US DNC, UK TPS or India NCPR.',
  'Calls do not announce that the caller is an AI or that the call is recorded unless you write it into the agent’s greeting.',
  'No limit on calling hours in the recipient’s time zone.',
  'No record of how or when each contact gave consent.',
];

const EMAIL_STEPS = [
  'Only email people you have a lawful reason to contact. In the EU and UK that usually means consent or a documented legitimate interest; Canada’s CASL generally requires consent.',
  'Put a clear way to opt out in every template, such as “Reply STOP and I won’t email you again”, along with your business name and postal address (required in the US by CAN-SPAM).',
  'When someone opts out, delete or stop using their contact before your next send. CAN-SPAM requires opt-outs to be honoured within 10 business days.',
  'Use accurate sender names and subject lines, and keep your SES bounce and complaint rates low.',
];

const CALL_STEPS = [
  'Get the consent your jurisdiction requires before calling. In the US, the FCC confirmed in February 2024 that AI-generated voices count as “artificial” voices under the TCPA, which generally means prior express consent is needed.',
  'Check numbers against the do-not-call registry that applies to each recipient before importing them.',
  'Say who is calling, on whose behalf, that the caller is an AI, and that the call is recorded. Many places require every party to agree to a recording.',
  'Call at reasonable local times, and remove anyone who asks not to be called again.',
];

const GREETING_EXAMPLE =
  'Hi {{firstName}}, this is Ava, an AI assistant calling on behalf of Northwind Labs. This call is recorded. Do you have a minute?';

export default function CompliancePage() {
  return (
    <div className="px-5 pb-24 pt-16 sm:px-8 sm:pt-24">
      {/* ---------------- Hero ---------------- */}
      <section className="mx-auto w-full max-w-3xl text-center">
        <Reveal>
          <p className="sig-label text-indigo-400">[ OUTREACH COMPLIANCE ]</p>
          <h1 className="sig-display mt-4 text-4xl font-extrabold leading-[1.05] text-white sm:text-6xl">
            Send responsibly
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-zinc-400 sm:text-lg">
            ReachConvert sends email and places calls from your accounts, so you are the sender and
            the rules for cold outreach apply to you. This page says what the product does today,
            what it does not do yet, and what you need to handle yourself.
          </p>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-zinc-500">
            This is general guidance, not legal advice. Rules differ by country and state; check
            the ones that apply to you and the people you contact.
          </p>
        </Reveal>
      </section>

      {/* ---------------- What the product does ---------------- */}
      <section className="mx-auto mt-16 w-full max-w-5xl">
        <Reveal>
          <h2 className="sig-display flex items-center gap-2.5 text-2xl font-extrabold text-white sm:text-3xl">
            <ShieldCheck className="h-6 w-6 text-emerald-400" />
            What ReachConvert does today
          </h2>
        </Reveal>
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          {PROVIDED.map((item, i) => (
            <Reveal key={item.title} delay={i * 60} className="h-full">
              <div className="sig-card h-full p-6">
                <p className="flex items-start gap-2.5 font-bold text-white">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                  {item.title}
                </p>
                <p className="mt-2 pl-6.5 text-sm leading-6 text-zinc-400">{item.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ---------------- What it does not do ---------------- */}
      <section className="mx-auto mt-16 w-full max-w-5xl">
        <Reveal>
          <div className="sig-card border-amber-500/30 p-7">
            <h2 className="sig-display flex items-center gap-2.5 text-2xl font-extrabold text-white sm:text-3xl">
              <AlertTriangle className="h-6 w-6 text-amber-400" />
              What it does not do yet
            </h2>
            <p className="mt-3 text-sm leading-6 text-zinc-400">
              These safeguards are not built in. Until they are, the steps below are yours to take.
            </p>
            <ul className="mt-5 space-y-3">
              {NOT_PROVIDED.map((gap) => (
                <li key={gap} className="flex items-start gap-2.5 text-sm leading-6 text-zinc-300">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                  {gap}
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      </section>

      {/* ---------------- Your responsibilities ---------------- */}
      <section className="mx-auto mt-16 grid w-full max-w-5xl grid-cols-1 gap-5 md:grid-cols-2">
        <Reveal className="h-full">
          <div className="sig-card h-full p-7">
            <h2 className="sig-display flex items-center gap-2.5 text-xl font-extrabold text-white">
              <Mail className="h-5 w-5 text-indigo-400" />
              Before you send email
            </h2>
            <ol className="mt-5 list-decimal space-y-3 pl-5 text-sm leading-6 text-zinc-300 marker:text-indigo-400">
              {EMAIL_STEPS.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </div>
        </Reveal>
        <Reveal delay={120} className="h-full">
          <div className="sig-card h-full p-7">
            <h2 className="sig-display flex items-center gap-2.5 text-xl font-extrabold text-white">
              <PhoneCall className="h-5 w-5 text-indigo-400" />
              Before you start AI calls
            </h2>
            <ol className="mt-5 list-decimal space-y-3 pl-5 text-sm leading-6 text-zinc-300 marker:text-indigo-400">
              {CALL_STEPS.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </div>
        </Reveal>
      </section>

      {/* ---------------- Greeting example ---------------- */}
      <section className="mx-auto mt-16 w-full max-w-3xl">
        <Reveal>
          <h2 className="sig-display text-center text-2xl font-extrabold text-white sm:text-3xl">
            Put the disclosure in the greeting
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-sm leading-6 text-zinc-400">
            The agent’s greeting is the first thing every person hears. Set it on the calling agent
            or the calling campaign so each call opens with who is calling and why.
          </p>
          <blockquote className="sig-card mt-6 p-6 font-mono text-sm leading-7 text-zinc-200">
            {GREETING_EXAMPLE}
          </blockquote>
        </Reveal>
      </section>

      {/* ---------------- Help ---------------- */}
      <section className="mx-auto mt-16 w-full max-w-3xl text-center">
        <Reveal>
          <p className="text-sm leading-6 text-zinc-400">
            Need one of the missing safeguards, or spotted something wrong on this page?
          </p>
          <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
            <a
              href={`${REPOS.backend.url}/issues`}
              target="_blank"
              rel="noopener noreferrer"
              className="sig-btn-ghost group justify-center"
            >
              Open an issue
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </a>
            <Link href="/contact" className="sig-btn-ghost group justify-center">
              Contact us
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
