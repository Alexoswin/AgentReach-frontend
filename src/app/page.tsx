'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  ArrowRight,
  Sparkles,
  Mail,
  PhoneCall,
  Bot,
  Radar,
  Users,
  BarChart3,
  Check,
  TrendingUp,
  ShieldCheck,
  Clock,
  Menu,
  X,
  Upload,
  Wand2,
  Rocket,
  GitPullRequest,
  MessageSquare,
  HeartHandshake,
} from 'lucide-react';
import Reveal from '@/components/Reveal';
import SiteFooter from '@/components/SiteFooter';
import { Brand, CountUp, TiltCard } from '@/components/fx';

const NAV_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'How it works', href: '#how' },
  { label: 'Analytics', href: '#analytics' },
];

// Routes rather than in-page anchors, so they render as <Link>.
const PAGE_LINKS = [
  { label: 'Contribute', href: '/contribute' },
  { label: 'Contact', href: '/contact' },
  { label: 'Support', href: '/support' },
];

const FEATURES = [
  {
    icon: Mail,
    title: 'MailReach — personalized email',
    body: 'Send thousands of tailored emails with AI-written variables, merge fields, and deliverability built in.',
    tone: 'a' as const,
  },
  {
    icon: PhoneCall,
    title: 'VoiceReach — AI voice calling',
    body: 'Launch VoiceReach calling campaigns where lifelike AI agents dial, qualify, and book on your behalf.',
    tone: 'a2' as const,
  },
  {
    icon: Bot,
    title: 'Configurable calling agents',
    body: 'Design agent personas, scripts, and objection handling, then deploy them across every campaign.',
    tone: 'a3' as const,
  },
  {
    icon: Users,
    title: 'Smart contact segments',
    body: 'Organize contacts by company and intent so the right message reaches the right person automatically.',
    tone: 'a2' as const,
  },
  {
    icon: Radar,
    title: 'Signals & playbooks',
    body: 'Watch filings, job posts, news, and bounces for buying signals, then trigger outreach with playbooks.',
    tone: 'a3' as const,
  },
  {
    icon: BarChart3,
    title: 'Real-time analytics',
    body: 'Track opens, replies, and call outcomes live, with template and segment performance in one view.',
    tone: 'a' as const,
  },
];

const TONE_STYLES = {
  a: { color: 'var(--a-400)', bg: 'color-mix(in oklab, var(--a-500) 13%, transparent)' },
  a2: { color: 'var(--a2-400)', bg: 'color-mix(in oklab, var(--a2-500) 13%, transparent)' },
  a3: { color: 'var(--a3-400)', bg: 'color-mix(in oklab, var(--a3-500) 13%, transparent)' },
};

const STEPS = [
  {
    icon: Upload,
    title: 'Import your contacts',
    body: 'Bring in leads and let ReachConvert group them into responsive company segments instantly.',
  },
  {
    icon: Wand2,
    title: 'Craft AI campaigns',
    body: 'Generate personalized email templates and calling scripts with the AI copilot in minutes.',
  },
  {
    icon: Rocket,
    title: 'Launch & track live',
    body: 'Fire off email and voice campaigns, then watch replies and bookings roll in on a live dashboard.',
  },
];

// Product facts, not usage claims — keep these in sync with the backend.
const STATS = [
  { value: '3', label: 'Outreach channels' },
  { value: '2', label: 'Telephony providers' },
  { value: '4', label: 'Signal sources' },
  { value: '28', label: 'Voice languages' },
];

function useScrolled(threshold = 12) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > threshold);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [threshold]);
  return scrolled;
}

function Navbar() {
  const scrolled = useScrolled();
  const [open, setOpen] = useState(false);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'border-b border-zinc-850 bg-zinc-950/80 backdrop-blur-xl'
          : 'border-b border-transparent bg-transparent'
      }`}
    >
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-5 sm:px-8">
        <Link href="/">
          <Brand />
        </Link>

        <nav className="hidden items-center gap-1 xl:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="sig-label rounded-lg px-4 py-2 text-zinc-500 transition-colors hover:text-indigo-300"
            >
              {link.label}
            </a>
          ))}
          {PAGE_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="sig-label rounded-lg px-4 py-2 text-zinc-500 transition-colors hover:text-indigo-300"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 xl:flex">
          <Link
            href="/documentation"
            className="rounded-lg px-4 py-2 text-sm font-semibold text-zinc-400 transition-colors hover:text-white"
          >
            Docs
          </Link>
          <Link
            href="/login"
            className="rounded-lg px-4 py-2 text-sm font-semibold text-zinc-400 transition-colors hover:text-white"
          >
            Sign in
          </Link>
          <span className="sig-btn-wrap">
            <Link href="/login" className="sig-btn group !px-5 !py-2.5">
              Get started
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </span>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-800 text-zinc-300 xl:hidden"
          aria-label="Toggle menu"
          aria-expanded={open}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-zinc-850 bg-zinc-950/95 px-5 py-4 backdrop-blur-xl xl:hidden">
          <div className="flex flex-col gap-1">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-300 hover:bg-zinc-900"
              >
                {link.label}
              </a>
            ))}
            <Link
              href="/documentation"
              onClick={() => setOpen(false)}
              className="rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-300 hover:bg-zinc-900"
            >
              Docs
            </Link>
            {PAGE_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-300 hover:bg-zinc-900"
              >
                {link.label}
              </Link>
            ))}
            <div className="mt-2 grid grid-cols-2 gap-2">
              <Link
                href="/login"
                className="rounded-lg border border-zinc-800 px-4 py-2.5 text-center text-sm font-semibold text-zinc-200"
              >
                Sign in
              </Link>
              <Link href="/login" className="sig-btn justify-center !py-2.5">
                Get started
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

function HeroVisual() {
  const bars = [52, 74, 40, 88, 63, 96, 71, 58];
  return (
    <div className="rig-scene relative">
      {/* Orbital rig behind the console */}
      <div className="pointer-events-none absolute -inset-14 hidden sm:block" aria-hidden="true">
        <div className="rig-orbit">
          <span className="rig-node" />
        </div>
        <div className="rig-orbit rig-orbit-2">
          <span className="rig-node rig-node-alt" />
        </div>
      </div>

      {/* Glow behind the console */}
      <div
        className="absolute -inset-6 rounded-[2rem] blur-2xl"
        style={{
          background:
            'linear-gradient(to top right, color-mix(in oklab, var(--a-500) 18%, transparent), color-mix(in oklab, var(--a2-500) 10%, transparent), color-mix(in oklab, var(--a3-500) 16%, transparent))',
        }}
      />

      {/* Float on a wrapper: the animation's transform would override .tilt-body's */}
      <div className="animate-float">
        <TiltCard strength={5}>
          <div className="tilt-body sig-card sig-ticks sig-ticks-on relative rounded-2xl p-4 shadow-2xl">
            <div className="tilt-glare" />
            {/* Console chrome */}
            <div className="flex items-center gap-2 pb-4">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-400/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
              <div className="sig-label ml-3 flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-950/70 px-3 py-1 text-zinc-400">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-indigo-400" />
                </span>
                LIVE SYNC
              </div>
            </div>

            {/* Stat chips */}
            <div className="grid grid-cols-3 gap-3" style={{ transform: 'translateZ(22px)' }}>
              {[
                { label: 'SENT', value: '18,204', tint: 'text-indigo-400' },
                { label: 'OPEN', value: '61%', tint: 'text-purple-400' },
                { label: 'REPLIES', value: '2,940', tint: 'text-emerald-400' },
              ].map((s) => (
                <div key={s.label} className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
                  <p className="sig-label text-zinc-600">{s.label}</p>
                  <p className={`mt-1 font-mono text-lg font-bold tracking-tight ${s.tint}`}>{s.value}</p>
                </div>
              ))}
            </div>

            {/* Animated chart */}
            <div className="mt-3 rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="flex items-center gap-1.5 text-xs font-bold text-white">
                  <TrendingUp className="h-4 w-4 text-indigo-400" />
                  Campaign performance
                </p>
                <span className="sig-label rounded-full bg-indigo-500/10 px-2 py-0.5 text-indigo-400">
                  +18% WK
                </span>
              </div>
              <div className="flex h-28 items-end gap-2">
                {bars.map((h, i) => (
                  <div key={i} className="flex h-full flex-1 flex-col justify-end">
                    <div
                      className="animate-bar rounded-sm"
                      style={{
                        height: `${h}%`,
                        animationDelay: `${i * 90}ms`,
                        background:
                          'linear-gradient(to top, color-mix(in oklab, var(--a-500) 45%, transparent), var(--a-400))',
                        boxShadow: '0 0 14px -4px var(--a-400)',
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </TiltCard>
      </div>

      {/* Floating badge cards */}
      <div className="animate-float-slow sig-glass absolute -left-6 top-24 hidden rounded-xl p-3 shadow-xl sm:block">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400">
            <PhoneCall className="h-4 w-4" />
          </div>
          <div className="leading-tight">
            <p className="text-xs font-bold text-white">Call booked</p>
            <p className="sig-label mt-0.5 text-zinc-500">AI AGENT · 0:42</p>
          </div>
        </div>
      </div>

      <div className="animate-float-slow animation-delay-2000 sig-glass absolute -right-4 bottom-10 hidden rounded-xl p-3 shadow-xl sm:block">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/15 text-indigo-400">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="leading-tight">
            <p className="text-xs font-bold text-white">AI drafted 40 emails</p>
            <p className="sig-label mt-0.5 text-zinc-500">IN 3 SECONDS</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-x-hidden text-zinc-100">
      <Navbar />

      {/* ---------------- Hero ---------------- */}
      <section className="relative isolate overflow-hidden px-5 pb-24 pt-32 sm:px-8 sm:pt-40">
        {/* Layered background: grid + blobs + radar sweep */}
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="bg-grid mask-fade-top absolute inset-0" />
          <div
            className="animate-blob absolute -left-24 top-10 h-96 w-96 rounded-full blur-3xl"
            style={{ background: 'color-mix(in oklab, var(--a-500) 16%, transparent)' }}
          />
          <div
            className="animate-blob animation-delay-2000 absolute right-0 top-0 h-[28rem] w-[28rem] rounded-full blur-3xl"
            style={{ background: 'color-mix(in oklab, var(--a2-500) 12%, transparent)' }}
          />
          <div className="absolute left-1/2 top-1/2 h-[52rem] w-[52rem] -translate-x-1/2 -translate-y-1/2 opacity-60">
            <div className="sig-radar" />
          </div>
        </div>

        <div className="mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-16 lg:grid-cols-[1.05fr_1fr]">
          <div>
            <Reveal>
              <span className="sig-label inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/60 px-3.5 py-2 text-zinc-400 backdrop-blur">
                <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
                AI VOICE + EMAIL · ONE WORKSPACE
                <span className="rounded-full bg-indigo-500/15 px-2 py-0.5 font-bold text-indigo-400">
                  NEW
                </span>
              </span>
            </Reveal>

            <Reveal delay={80}>
              <h1 className="sig-display mt-6 text-4xl font-extrabold leading-[1.02] text-white sm:text-6xl lg:text-7xl">
                Turn cold outreach into{' '}
                <span className="sig-glow animate-gradient bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                  booked conversations
                </span>
              </h1>
            </Reveal>

            <Reveal delay={160}>
              <p className="mt-6 max-w-xl text-base leading-7 text-zinc-400 sm:text-lg">
                ReachConvert blends personalized bulk email, autonomous AI calling agents, and
                real-time analytics into one platform — so your team reaches more people and converts
                more replies.
              </p>
            </Reveal>

            <Reveal delay={240}>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
                <span className="sig-btn-wrap">
                  <Link href="/login" className="sig-btn shimmer group">
                    Start free
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                </span>
                <a href="#features" className="sig-btn-ghost">
                  Explore features
                </a>
              </div>
            </Reveal>

            <Reveal delay={320}>
              <div className="sig-label mt-9 flex flex-wrap items-center gap-x-6 gap-y-3 text-zinc-600">
                <span className="inline-flex items-center gap-1.5">
                  <Check className="h-4 w-4 text-emerald-400" /> NO CREDIT CARD
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-emerald-400" /> SOC 2 FRIENDLY
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-emerald-400" /> LIVE IN MINUTES
                </span>
              </div>
            </Reveal>
          </div>

          <Reveal delay={200}>
            <HeroVisual />
          </Reveal>
        </div>
      </section>

      {/* ---------------- Stats ---------------- */}
      <section className="px-5 py-20 sm:px-8">
        <div className="mx-auto grid w-full max-w-7xl grid-cols-2 gap-4 lg:grid-cols-4">
          {STATS.map((stat, i) => (
            <Reveal key={stat.label} delay={i * 90}>
              <div className="sig-card sig-ticks group p-6 text-center transition-all duration-300 hover:-translate-y-1">
                <p className="sig-glow font-mono text-3xl font-bold tracking-tight text-indigo-300 sm:text-4xl">
                  <CountUp value={stat.value} />
                </p>
                <p className="sig-label mt-2.5 text-zinc-500">{stat.label}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ---------------- Features ---------------- */}
      <section id="features" className="scroll-mt-20 px-5 py-20 sm:px-8">
        <div className="mx-auto w-full max-w-7xl">
          <Reveal>
            <div className="mx-auto max-w-2xl text-center">
              <p className="sig-label text-indigo-400">[ EVERYTHING YOU NEED ]</p>
              <h2 className="sig-display mt-4 text-3xl font-extrabold text-white sm:text-5xl">
                One workspace for every channel
              </h2>
              <p className="mt-4 text-base leading-7 text-zinc-400">
                Email, voice, contacts, and analytics work together — no more stitching five tools into
                a fragile funnel.
              </p>
            </div>
          </Reveal>

          <div className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature, i) => {
              const Icon = feature.icon;
              const tone = TONE_STYLES[feature.tone];
              return (
                <Reveal key={feature.title} delay={(i % 3) * 90} className="h-full">
                  <TiltCard className="group h-full">
                    <div className="tilt-body sig-card sig-ticks relative h-full overflow-hidden rounded-2xl p-6">
                      <div className="tilt-glare" />
                      <div
                        className="absolute -right-10 -top-10 h-28 w-28 rounded-full opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100"
                        style={{ background: tone.bg }}
                      />
                      <div
                        className="flex h-12 w-12 items-center justify-center rounded-xl border transition-transform duration-300"
                        style={{
                          color: tone.color,
                          background: tone.bg,
                          borderColor: `color-mix(in oklab, ${tone.color} 30%, transparent)`,
                          transform: 'translateZ(26px)',
                        }}
                      >
                        <Icon className="h-6 w-6" />
                      </div>
                      <h3 className="sig-display mt-5 text-lg font-bold text-white">{feature.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-zinc-400">{feature.body}</p>
                    </div>
                  </TiltCard>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ---------------- How it works ---------------- */}
      <section id="how" className="scroll-mt-20 px-5 py-20 sm:px-8">
        <div className="mx-auto w-full max-w-7xl">
          <Reveal>
            <div className="mx-auto max-w-2xl text-center">
              <p className="sig-label text-indigo-400">[ HOW IT WORKS ]</p>
              <h2 className="sig-display mt-4 text-3xl font-extrabold text-white sm:text-5xl">
                Launch your first campaign today
              </h2>
            </div>
          </Reveal>

          <div className="relative mt-14 grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="sig-rule pointer-events-none absolute left-0 right-0 top-9 hidden md:block" />
            {STEPS.map((step, i) => {
              const Icon = step.icon;
              return (
                <Reveal key={step.title} delay={i * 120}>
                  <div className="sig-card sig-ticks relative p-6 text-center transition-all duration-300 hover:-translate-y-1">
                    <div className="sig-glass mx-auto flex h-16 w-16 items-center justify-center rounded-2xl">
                      <Icon className="h-7 w-7 text-indigo-400" />
                    </div>
                    <span className="sig-label mt-4 inline-block rounded-full bg-indigo-500/10 px-3 py-1 text-indigo-400">
                      0{i + 1} / STEP
                    </span>
                    <h3 className="sig-display mt-3 text-lg font-bold text-white">{step.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-zinc-400">{step.body}</p>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ---------------- Analytics showcase ---------------- */}
      <section id="analytics" className="scroll-mt-20 px-5 py-20 sm:px-8">
        <div className="mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-12 lg:grid-cols-2">
          <Reveal>
            <div>
              <p className="sig-label text-indigo-400">[ ANALYTICS ]</p>
              <h2 className="sig-display mt-4 text-3xl font-extrabold text-white sm:text-5xl">
                Real-time performance you can act on
              </h2>
              <p className="mt-4 text-base leading-7 text-zinc-400">
                Every open, reply, and call outcome streams into a live dashboard. Compare templates,
                spot your best segments, and double down on what converts.
              </p>
              <ul className="mt-6 space-y-3">
                {[
                  'Live sync across MailReach and VoiceReach campaigns',
                  'Template & company-segment performance breakdowns',
                  'Deliverability, open, reply, and call success rates',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-zinc-300">
                    <span className="mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full bg-emerald-500/15">
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
              <Link href="/login" className="sig-btn-ghost group mt-8">
                See it in action
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </Reveal>

          <Reveal delay={140}>
            <TiltCard strength={5}>
              <div className="tilt-body relative">
                <div
                  className="absolute -inset-4 rounded-3xl blur-2xl"
                  style={{
                    background:
                      'linear-gradient(to top right, color-mix(in oklab, var(--a-500) 13%, transparent), color-mix(in oklab, var(--a2-500) 13%, transparent))',
                  }}
                />
                <div className="sig-card sig-ticks sig-ticks-on relative space-y-4 rounded-2xl p-6 shadow-2xl">
                  <div className="tilt-glare" />
                  {[
                    { name: 'Founders — Series A', sent: '4,120', open: 68, reply: 24 },
                    { name: 'Growth marketers', sent: '2,880', open: 54, reply: 17 },
                    { name: 'RevOps leaders', sent: '1,540', open: 72, reply: 31 },
                  ].map((row) => (
                    <div key={row.name} className="rounded-xl border border-zinc-850/60 bg-zinc-950/50 p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-zinc-100">{row.name}</span>
                        <span className="sig-label rounded-full border border-indigo-500/10 bg-indigo-500/10 px-2 py-0.5 text-indigo-400">
                          {row.sent} SENT
                        </span>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-4 text-xs">
                        <div>
                          <p className="sig-label text-zinc-600">OPEN</p>
                          <div className="mt-1.5 flex items-center gap-2">
                            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-800">
                              <div className="h-full rounded-full bg-purple-500" style={{ width: `${row.open}%` }} />
                            </div>
                            <span className="font-mono font-bold text-zinc-300">{row.open}%</span>
                          </div>
                        </div>
                        <div>
                          <p className="sig-label text-zinc-600">REPLY</p>
                          <div className="mt-1.5 flex items-center gap-2">
                            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-800">
                              <div className="h-full rounded-full bg-emerald-500" style={{ width: `${row.reply}%` }} />
                            </div>
                            <span className="font-mono font-bold text-zinc-300">{row.reply}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </TiltCard>
          </Reveal>
        </div>
      </section>

      {/* ---------------- CTA ---------------- */}
      <section className="px-5 py-20 sm:px-8">
        <Reveal>
          <div
            className="sig-ticks sig-ticks-on relative mx-auto w-full max-w-6xl overflow-hidden rounded-3xl border p-10 text-center shadow-2xl sm:p-16"
            style={{
              borderColor: 'color-mix(in oklab, var(--a-500) 25%, transparent)',
              background:
                'linear-gradient(to top right, color-mix(in oklab, var(--a-500) 12%, var(--z-950)), color-mix(in oklab, var(--a2-500) 8%, var(--z-950)), color-mix(in oklab, var(--a3-500) 10%, var(--z-950)))',
            }}
          >
            <div className="bg-dots pointer-events-none absolute inset-0 opacity-50" />
            <div
              className="animate-blob absolute -left-10 -top-10 h-56 w-56 rounded-full blur-3xl"
              style={{ background: 'color-mix(in oklab, var(--a-500) 22%, transparent)' }}
            />
            <div
              className="animate-blob animation-delay-2000 absolute -bottom-10 -right-10 h-56 w-56 rounded-full blur-3xl"
              style={{ background: 'color-mix(in oklab, var(--a3-500) 18%, transparent)' }}
            />
            <div className="relative">
              <p className="sig-label text-indigo-400">[ TRANSMISSION READY ]</p>
              <h2 className="sig-display mx-auto mt-4 max-w-2xl text-3xl font-extrabold text-white sm:text-5xl">
                Ready to convert more replies?
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-base text-zinc-300">
                Use ReachConvert to run MailReach email and VoiceReach calling campaigns that
                actually book meetings.
              </p>
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <span className="sig-btn-wrap justify-center">
                  <Link href="/login" className="sig-btn shimmer group w-full sm:w-auto">
                    Get started free
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                </span>
                <Link href="/login" className="sig-btn-ghost justify-center">
                  Sign in
                </Link>
              </div>

              <div className="mx-auto mt-10 max-w-2xl border-t border-zinc-800/80 pt-6">
                <p className="sig-label text-zinc-500">OPEN SOURCE · BUILT IN THE OPEN</p>
                <div className="mt-4 flex flex-col justify-center gap-3 sm:flex-row">
                  <Link href="/contribute" className="sig-btn-ghost group justify-center">
                    <GitPullRequest className="h-4 w-4 text-indigo-400" />
                    Contribute
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                  <Link href="/contact" className="sig-btn-ghost group justify-center">
                    <MessageSquare className="h-4 w-4 text-indigo-400" />
                    Contact us
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                  <Link href="/support" className="sig-btn-ghost group justify-center">
                    <HeartHandshake className="h-4 w-4 text-indigo-400" />
                    Support
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      <SiteFooter />
    </div>
  );
}
