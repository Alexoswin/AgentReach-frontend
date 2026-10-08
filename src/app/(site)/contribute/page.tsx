import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/seo';
import Link from 'next/link';
import {
  ArrowRight,
  BookOpen,
  Bug,
  Copyleft,
  GitFork,
  GitPullRequest,
  Lightbulb,
  Server,
  Monitor,
  Terminal,
} from 'lucide-react';
import Reveal from '@/components/Reveal';
import { LICENSE_URL, REPOS } from '@/lib/site';

export const metadata: Metadata = pageMetadata({
  title: 'Contribute — ReachConvert',
  description:
    'ReachConvert is open source under the AGPL-3.0. Report bugs, improve the docs, or send a pull request.',
  path: '/contribute',
});

const REPO_CARDS = [
  {
    ...REPOS.frontend,
    icon: Monitor,
    body: 'Next.js dashboard, landing page, and the in-app documentation portal.',
    stack: ['Next.js 16', 'React 19', 'Tailwind v4', 'TanStack Query'],
  },
  {
    ...REPOS.backend,
    icon: Server,
    body: 'NestJS API, MongoDB persistence, signal polling jobs, and the Twilio ↔ Gemini Live calling bridge.',
    stack: ['NestJS 11', 'MongoDB', 'Twilio', 'Gemini'],
  },
];

const WAYS = [
  {
    icon: Bug,
    title: 'Report a bug',
    body: 'Open an issue with steps to reproduce, what you expected, and what actually happened. Logs and screenshots help.',
  },
  {
    icon: Lightbulb,
    title: 'Suggest a feature',
    body: 'Open an issue describing the problem first. Agreeing on the approach before coding saves rework.',
  },
  {
    icon: BookOpen,
    title: 'Improve the docs',
    body: 'Product guides are authored in src/lib/docs.ts in the frontend repo. Typos and unclear steps are fair game.',
  },
  {
    icon: GitPullRequest,
    title: 'Send code',
    body: 'Pick an open issue or fix something you ran into. Small, focused pull requests get reviewed fastest.',
  },
];

const SETUP = [
  {
    title: 'Backend',
    note: 'API on http://localhost:3001/api · Swagger UI on /docs',
    code: `git clone https://github.com/<your-username>/${REPOS.backend.name}.git
cd ${REPOS.backend.name}
npm install
cp .env.example .env
npm run start:dev`,
  },
  {
    title: 'Frontend',
    note: 'Set NEXT_PUBLIC_API_URL=http://localhost:3001/api in .env',
    code: `git clone https://github.com/<your-username>/${REPOS.frontend.name}.git
cd ${REPOS.frontend.name}
npm install
cp .env.example .env
npm run dev`,
  },
];

const PR_STEPS = [
  {
    title: 'Fork and branch',
    body: 'Fork the repository and create a branch from main, e.g. fix/campaign-pagination.',
  },
  {
    title: 'Keep it focused',
    body: 'One change per pull request. Match the style of the surrounding code.',
  },
  {
    title: 'Check it locally',
    body: 'Run npm run lint and npm run build in the repo you changed. In the backend, also run npm test.',
  },
  {
    title: 'Open the pull request',
    body: 'Target main, explain what changed and why, and add screenshots for UI changes.',
  },
];

export default function ContributePage() {
  return (
    <div className="px-5 pb-24 pt-16 sm:px-8 sm:pt-24">
      {/* ---------------- Hero ---------------- */}
      <section className="mx-auto w-full max-w-3xl text-center">
        <Reveal>
          <p className="sig-label text-indigo-400">[ OPEN SOURCE · AGPL-3.0 ]</p>
          <h1 className="sig-display mt-4 text-4xl font-extrabold leading-[1.05] text-white sm:text-6xl">
            Help build ReachConvert
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-zinc-400 sm:text-lg">
            Bug reports, documentation fixes, and pull requests are all welcome. Here is how to get
            set up and get your change merged.
          </p>
        </Reveal>
        <Reveal delay={120}>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <span className="sig-btn-wrap justify-center">
              <a
                href={REPOS.frontend.url}
                target="_blank"
                rel="noopener noreferrer"
                className="sig-btn group w-full sm:w-auto"
              >
                <GitFork className="h-4 w-4" />
                View on GitHub
              </a>
            </span>
            <Link href="/documentation" className="sig-btn-ghost justify-center">
              Read the technical docs
            </Link>
          </div>
        </Reveal>
      </section>

      {/* ---------------- Repositories ---------------- */}
      <section className="mx-auto mt-20 w-full max-w-5xl">
        <Reveal>
          <p className="sig-label text-indigo-400">[ REPOSITORIES ]</p>
          <h2 className="sig-display mt-3 text-2xl font-extrabold text-white sm:text-3xl">
            Two repos, one product
          </h2>
        </Reveal>
        <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
          {REPO_CARDS.map((repo, i) => {
            const Icon = repo.icon;
            return (
              <Reveal key={repo.name} delay={i * 90} className="h-full">
                <div className="sig-card sig-ticks flex h-full flex-col p-6">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="font-mono text-base font-bold text-white">{repo.name}</h3>
                  </div>
                  <p className="mt-4 text-sm leading-6 text-zinc-400">{repo.body}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {repo.stack.map((tech) => (
                      <span
                        key={tech}
                        className="sig-label rounded-full border border-zinc-800 bg-zinc-950/60 px-2.5 py-1 text-zinc-400"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                  <div className="mt-auto flex gap-5 pt-6 text-sm font-semibold">
                    <a
                      href={repo.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group inline-flex items-center gap-1.5 text-indigo-300 transition-colors hover:text-white"
                    >
                      Code
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </a>
                    <a
                      href={`${repo.url}/issues`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group inline-flex items-center gap-1.5 text-zinc-400 transition-colors hover:text-white"
                    >
                      Issues
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </a>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* ---------------- Ways to contribute ---------------- */}
      <section className="mx-auto mt-20 w-full max-w-5xl">
        <Reveal>
          <p className="sig-label text-indigo-400">[ WAYS TO HELP ]</p>
          <h2 className="sig-display mt-3 text-2xl font-extrabold text-white sm:text-3xl">
            Every contribution counts
          </h2>
        </Reveal>
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {WAYS.map((way, i) => {
            const Icon = way.icon;
            return (
              <Reveal key={way.title} delay={(i % 2) * 90} className="h-full">
                <div className="sig-card flex h-full items-start gap-4 p-5">
                  <div className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">{way.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-zinc-400">{way.body}</p>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* ---------------- Local setup ---------------- */}
      <section className="mx-auto mt-20 w-full max-w-5xl">
        <Reveal>
          <p className="sig-label text-indigo-400">[ LOCAL SETUP ]</p>
          <h2 className="sig-display mt-3 text-2xl font-extrabold text-white sm:text-3xl">
            Run it on your machine
          </h2>
          <p className="mt-3 text-sm leading-6 text-zinc-400">
            You need Node.js 20+, npm, and a MongoDB instance (local or hosted). Fork both repos, then
            start the backend before the frontend.
          </p>
        </Reveal>
        <div className="mt-6 grid grid-cols-1 gap-5">
          {SETUP.map((block, i) => (
            <Reveal key={block.title} delay={i * 90} className="h-full">
              <div className="sig-card flex h-full flex-col overflow-hidden">
                <div className="flex items-center gap-2 border-b border-zinc-850 px-5 py-3">
                  <Terminal className="h-4 w-4 text-indigo-400" />
                  <span className="sig-label text-zinc-300">{block.title}</span>
                </div>
                <pre className="overflow-x-auto px-5 py-4 font-mono text-[13px] leading-6 text-zinc-200">
                  <code>{block.code}</code>
                </pre>
                <p className="mt-auto border-t border-zinc-850 px-5 py-3 text-xs text-zinc-500">
                  {block.note}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ---------------- Pull requests ---------------- */}
      <section className="mx-auto mt-20 w-full max-w-5xl">
        <Reveal>
          <p className="sig-label text-indigo-400">[ PULL REQUESTS ]</p>
          <h2 className="sig-display mt-3 text-2xl font-extrabold text-white sm:text-3xl">
            From fork to merge
          </h2>
        </Reveal>
        <ol className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PR_STEPS.map((step, i) => (
            <li key={step.title} className="h-full">
              <Reveal delay={i * 90} className="h-full">
                <div className="sig-card h-full p-5">
                  <span className="sig-label inline-block rounded-full bg-indigo-500/10 px-3 py-1 text-indigo-400">
                    0{i + 1} / STEP
                  </span>
                  <h3 className="mt-3 text-base font-bold text-white">{step.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-zinc-400">{step.body}</p>
                </div>
              </Reveal>
            </li>
          ))}
        </ol>
      </section>

      {/* ---------------- License + contact ---------------- */}
      <section className="mx-auto mt-20 grid w-full max-w-5xl grid-cols-1 gap-5 md:grid-cols-[1.4fr_1fr]">
        <Reveal className="h-full">
          <div className="sig-card sig-ticks sig-ticks-on flex h-full items-start gap-4 p-6">
            <div className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400">
              <Copyleft className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Licensed under AGPL-3.0</h3>
              <p className="mt-1 text-sm leading-6 text-zinc-400">
                ReachConvert is released under the GNU Affero General Public License v3.0. By opening
                a pull request, you agree that your contribution is licensed under the same terms.
              </p>
              <a
                href={LICENSE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="group mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-300 transition-colors hover:text-white"
              >
                Read the license
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </a>
            </div>
          </div>
        </Reveal>
        <Reveal delay={90} className="h-full">
          <div className="sig-card flex h-full flex-col justify-between p-6">
            <div>
              <h3 className="text-base font-bold text-white">Questions first?</h3>
              <p className="mt-1 text-sm leading-6 text-zinc-400">
                Not sure where to start or whether an idea fits? Get in touch before you write code.
              </p>
            </div>
            <Link href="/contact" className="sig-btn-ghost group mt-5 self-start">
              Contact me
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </Reveal>
      </section>

      <Reveal>
        <p className="mx-auto mt-14 max-w-xl text-center text-sm text-zinc-500">
          Can&apos;t contribute code right now?{' '}
          <Link href="/support" className="font-semibold text-indigo-300 transition-colors hover:text-white">
            Support the project
          </Link>{' '}
          instead.
        </p>
      </Reveal>
    </div>
  );
}
