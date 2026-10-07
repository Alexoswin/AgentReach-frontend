import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  BookOpen,
  Bug,
  CodeXml,
  FlaskConical,
  HeartHandshake,
  IndianRupee,
  KeyRound,
  QrCode,
  Server,
  Share2,
  Smartphone,
  Star,
} from 'lucide-react';
import CopyButton from '@/components/CopyButton';
import Reveal from '@/components/Reveal';
import { REPOS, UPI_ID, UPI_QR_SRC } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Support — ReachConvert',
  description:
    'ReachConvert is free and open source. Support its development with a UPI payment, or help for free by starring, reporting bugs, and sharing.',
};

const UPI_PAY_HREF = `upi://pay?pa=${encodeURIComponent(UPI_ID)}&pn=${encodeURIComponent('ReachConvert')}&cu=INR`;

const COSTS = [
  {
    icon: CodeXml,
    title: 'Development time',
    body: 'Building new features, fixing bugs, and reviewing pull requests.',
  },
  {
    icon: FlaskConical,
    title: 'Real-provider testing',
    body: 'My own Twilio, Gemini, and AWS SES test accounts, used to check every release end to end before it ships.',
  },
  {
    icon: Server,
    title: 'Hosting',
    body: 'Keeping the live app, API, and database online.',
  },
  {
    icon: BookOpen,
    title: 'Docs and help',
    body: 'Keeping setup guides current and answering questions from users.',
  },
];

const FREE_WAYS = [
  {
    icon: Star,
    title: 'Star the repos',
    body: 'Stars help other developers find the project.',
    href: REPOS.frontend.url,
    cta: 'Open GitHub',
    external: true,
  },
  {
    icon: Bug,
    title: 'Report bugs or send fixes',
    body: 'Issues and pull requests make ReachConvert better for everyone.',
    href: '/contribute',
    cta: 'How to contribute',
    external: false,
  },
  {
    icon: Share2,
    title: 'Tell someone',
    body: 'Know a team running outreach by hand, or a developer who would enjoy hacking on it? Send them the link.',
  },
];

export default function SupportPage() {
  return (
    <div className="px-5 pb-24 pt-16 sm:px-8 sm:pt-24">
      {/* ---------------- Hero ---------------- */}
      <section className="mx-auto w-full max-w-3xl text-center">
        <Reveal>
          <p className="sig-label text-indigo-400">[ SUPPORT THE PROJECT ]</p>
          <h1 className="sig-display mt-4 text-4xl font-extrabold leading-[1.05] text-white sm:text-6xl">
            Support ReachConvert
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-zinc-400 sm:text-lg">
            ReachConvert is free and open source. If it is useful to you, a contribution of any size
            helps cover the costs of building and testing it.
          </p>
        </Reveal>
      </section>

      <section className="mx-auto mt-14 grid w-full max-w-5xl grid-cols-1 gap-5 md:grid-cols-[1fr_1.15fr]">
        {/* ---------------- UPI ---------------- */}
        <Reveal className="h-full">
          <div className="sig-card sig-ticks sig-ticks-on flex h-full flex-col items-center p-6 text-center sm:p-8">
            <div className="flex items-center gap-2">
              <IndianRupee className="h-4 w-4 text-indigo-400" />
              <p className="sig-label text-zinc-400">Pay with UPI</p>
            </div>

            {UPI_QR_SRC ? (
              // QR codes need a light background to scan reliably, whatever the theme.
              <div className="mt-6 rounded-2xl bg-white p-3">
                <Image src={UPI_QR_SRC} alt="UPI QR code" width={208} height={208} className="h-52 w-52" />
              </div>
            ) : (
              <div className="mt-6 flex h-56 w-56 flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-zinc-700 bg-zinc-950/50">
                <QrCode className="h-12 w-12 text-zinc-700" />
                <span className="sig-label text-zinc-600">QR code coming soon</span>
              </div>
            )}

            <p className="mt-5 text-sm text-zinc-400">
              Scan with Google Pay, PhonePe, Paytm, BHIM, or any UPI app.
            </p>

            <div className="mt-6 w-full border-t border-zinc-850 pt-6">
              <p className="sig-label text-zinc-500">UPI ID</p>
              {UPI_ID ? (
                <>
                  <p className="mt-2 break-all font-mono text-lg font-bold text-white">{UPI_ID}</p>
                  <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
                    {/* upi:// links only open an app on phones, so the button is mobile-only */}
                    <div className="sm:hidden">
                      <span className="sig-btn-wrap w-full">
                        <a href={UPI_PAY_HREF} className="sig-btn w-full">
                          <Smartphone className="h-4 w-4" />
                          Open UPI app
                        </a>
                      </span>
                    </div>
                    <CopyButton value={UPI_ID} label="Copy UPI ID" />
                  </div>
                </>
              ) : (
                <p className="mt-2 text-sm text-zinc-500">Coming soon</p>
              )}
            </div>
          </div>
        </Reveal>

        {/* ---------------- Where it goes ---------------- */}
        <Reveal delay={90} className="h-full">
          <div className="sig-card flex h-full flex-col p-6 sm:p-8">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400">
                <HeartHandshake className="h-5 w-5" />
              </div>
              <h2 className="text-base font-bold text-white">Where your support goes</h2>
            </div>
            <p className="mt-3 text-sm leading-6 text-zinc-400">
              ReachConvert is built and maintained by one developer. Your support pays for the
              platform itself:
            </p>
            <ul className="mt-6 space-y-5">
              {COSTS.map((cost) => {
                const Icon = cost.icon;
                return (
                  <li key={cost.title} className="flex items-start gap-3">
                    <Icon className="mt-0.5 h-4 w-4 flex-none text-indigo-400" />
                    <div>
                      <p className="text-sm font-semibold text-white">{cost.title}</p>
                      <p className="mt-0.5 text-sm leading-6 text-zinc-400">{cost.body}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
            <div className="mt-auto pt-6">
              <div className="flex items-start gap-3 rounded-xl border border-zinc-800 bg-zinc-950/50 p-4">
                <KeyRound className="mt-0.5 h-4 w-4 flex-none text-emerald-400" />
                <p className="text-sm leading-6 text-zinc-400">
                  <span className="font-semibold text-zinc-200">Your keys, your bill.</span> Campaigns
                  run on your own Twilio, Gemini, and AWS SES credentials, so provider usage is billed
                  straight to your accounts. Support never covers or touches it.
                </p>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ---------------- Free ways to help ---------------- */}
      <section className="mx-auto mt-20 w-full max-w-5xl">
        <Reveal>
          <p className="sig-label text-indigo-400">[ NO MONEY NEEDED ]</p>
          <h2 className="sig-display mt-3 text-2xl font-extrabold text-white sm:text-3xl">
            Other ways to help
          </h2>
        </Reveal>
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {FREE_WAYS.map((way, i) => {
            const Icon = way.icon;
            const linkClass =
              'group mt-auto inline-flex items-center gap-1.5 pt-4 text-sm font-semibold text-indigo-300 transition-colors hover:text-white';
            const linkBody = (
              <>
                {way.cta}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </>
            );
            return (
              <Reveal key={way.title} delay={i * 90} className="h-full">
                <div className="sig-card flex h-full flex-col p-5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 text-base font-bold text-white">{way.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-zinc-400">{way.body}</p>
                  {way.href &&
                    (way.external ? (
                      <a href={way.href} target="_blank" rel="noopener noreferrer" className={linkClass}>
                        {linkBody}
                      </a>
                    ) : (
                      <Link href={way.href} className={linkClass}>
                        {linkBody}
                      </Link>
                    ))}
                </div>
              </Reveal>
            );
          })}
        </div>
      </section>

      <Reveal>
        <p className="mx-auto mt-14 max-w-xl text-center text-xs leading-5 text-zinc-500">
          Payments go to me as an individual developer to support ReachConvert. They are not
          charitable donations and are not tax-deductible.
        </p>
      </Reveal>
    </div>
  );
}
