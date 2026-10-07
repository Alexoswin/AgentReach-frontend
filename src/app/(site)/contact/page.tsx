import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Bug, GitFork, Mail, MessageSquareText, Phone } from 'lucide-react';
import Reveal from '@/components/Reveal';
import { CONTACT_EMAIL, CONTACT_PHONE, CONTACT_PHONE_HREF, GITHUB_PROFILE_URL, REPOS } from '@/lib/site';
import CopyButton from '@/components/CopyButton';

export const metadata: Metadata = {
  title: 'Contact — ReachConvert',
  description: 'Get in touch about ReachConvert: questions, feedback, collaboration, or bug reports.',
};

const TOPICS = [
  'Questions about running or self-hosting ReachConvert',
  'Feedback on features or the documentation',
  'Collaboration and contribution ideas',
];

export default function ContactPage() {
  return (
    <div className="px-5 pb-24 pt-16 sm:px-8 sm:pt-24">
      {/* ---------------- Hero ---------------- */}
      <section className="mx-auto w-full max-w-3xl text-center">
        <Reveal>
          <p className="sig-label text-indigo-400">[ GET IN TOUCH ]</p>
          <h1 className="sig-display mt-4 text-4xl font-extrabold leading-[1.05] text-white sm:text-6xl">
            Contact me
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-zinc-400 sm:text-lg">
            Have a question about ReachConvert, feedback, or an idea to work on together? Email or
            call me directly. For bugs and feature requests, a GitHub issue is the fastest way to get
            it tracked.
          </p>
        </Reveal>
      </section>

      <section className="mx-auto mt-14 grid w-full max-w-5xl grid-cols-1 gap-5 md:grid-cols-[1.4fr_1fr]">
        {/* ---------------- Email ---------------- */}
        <Reveal className="h-full">
          <div className="sig-card sig-ticks sig-ticks-on flex h-full flex-col p-6 sm:p-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400">
              <Mail className="h-6 w-6" />
            </div>
            <p className="sig-label mt-6 text-zinc-500">Email</p>
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="sig-display mt-2 break-all text-2xl font-bold text-white transition-colors hover:text-indigo-300 sm:text-3xl"
            >
              {CONTACT_EMAIL}
            </a>
            <p className="sig-label mt-6 text-zinc-500">Phone</p>
            <a
              href={CONTACT_PHONE_HREF}
              className="group mt-2 inline-flex items-center gap-2.5 self-start text-xl font-bold text-white transition-colors hover:text-indigo-300 sm:text-2xl"
            >
              <Phone className="h-5 w-5 flex-none text-indigo-400" />
              <span className="sig-display">{CONTACT_PHONE}</span>
            </a>
            <ul className="mt-6 space-y-3">
              {TOPICS.map((topic) => (
                <li key={topic} className="flex items-start gap-3 text-sm text-zinc-300">
                  <MessageSquareText className="mt-0.5 h-4 w-4 flex-none text-indigo-400" />
                  {topic}
                </li>
              ))}
            </ul>
            <div className="mt-auto flex flex-col gap-3 pt-8 sm:flex-row">
              <span className="sig-btn-wrap">
                <a href={`mailto:${CONTACT_EMAIL}`} className="sig-btn group w-full sm:w-auto">
                  Send an email
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </a>
              </span>
              <CopyButton value={CONTACT_EMAIL} label="Copy address" />
            </div>
          </div>
        </Reveal>

        <div className="flex flex-col gap-5">
          {/* ---------------- GitHub ---------------- */}
          <Reveal delay={90} className="h-full">
            <div className="sig-card flex h-full flex-col p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400">
                  <GitFork className="h-5 w-5" />
                </div>
                <h2 className="text-base font-bold text-white">GitHub</h2>
              </div>
              <p className="mt-3 text-sm leading-6 text-zinc-400">
                Follow the project and see what is in progress.
              </p>
              <a
                href={GITHUB_PROFILE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="group mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-300 transition-colors hover:text-white"
              >
                {GITHUB_PROFILE_URL.replace('https://', '')}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </a>
            </div>
          </Reveal>

          {/* ---------------- Issues ---------------- */}
          <Reveal delay={180} className="h-full">
            <div className="sig-card flex h-full flex-col p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400">
                  <Bug className="h-5 w-5" />
                </div>
                <h2 className="text-base font-bold text-white">Found a bug?</h2>
              </div>
              <p className="mt-3 text-sm leading-6 text-zinc-400">
                Open an issue in the repo where it happens.
              </p>
              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold">
                {[
                  { label: 'Frontend issues', url: REPOS.frontend.url },
                  { label: 'Backend issues', url: REPOS.backend.url },
                ].map((repo) => (
                  <a
                    key={repo.label}
                    href={`${repo.url}/issues`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group inline-flex items-center gap-1.5 text-indigo-300 transition-colors hover:text-white"
                  >
                    {repo.label}
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </a>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <Reveal>
        <p className="mx-auto mt-14 max-w-xl text-center text-sm text-zinc-500">
          Want to send a fix yourself?{' '}
          <Link href="/contribute" className="font-semibold text-indigo-300 transition-colors hover:text-white">
            Read the contribution guide
          </Link>
          .
        </p>
      </Reveal>
    </div>
  );
}
