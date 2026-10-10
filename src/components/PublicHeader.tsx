'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowRight, ChevronDown, Menu, X } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { Brand } from '@/components/fx';

const PRODUCT_LINKS = [
  { label: 'AI calling', href: '/ai-calling' },
  { label: 'Email automation', href: '/email-automation' },
];

const EXPLORE_LINKS = [
  { label: 'Calling agents', href: '/calling-agents' },
  { label: 'Calling automation', href: '/calling-automation' },
  { label: 'Outreach automation', href: '/outreach-automation' },
  { label: 'Compare', href: '/compare' },
  { label: 'Compliance', href: '/compliance' },
];

export default function PublicHeader({ landing = false }: { landing?: boolean }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [exploreOpen, setExploreOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const anchorHref = (id: string) => (landing ? `#${id}` : `/#${id}`);
  const headerSurface = landing && !scrolled
    ? 'border-transparent bg-transparent'
    : 'border-zinc-850 bg-zinc-950/85 shadow-lg shadow-black/5 backdrop-blur-xl';

  return (
    <header className={`${landing ? 'fixed' : 'sticky'} inset-x-0 top-0 z-50 border-b transition-all duration-300 ${headerSurface}`}>
      <div className="mx-auto flex h-[4.5rem] w-full max-w-7xl items-center justify-between gap-4 px-5 sm:px-8">
        <Link href="/" aria-label="ReachConvert home" className="shrink-0">
          <Brand />
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary navigation">
          <a href={anchorHref('features')} className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-400 transition-colors hover:bg-zinc-900/70 hover:text-white">
            Features
          </a>
          <div className="mx-1 h-5 w-px bg-zinc-800" aria-hidden="true" />
          {PRODUCT_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-zinc-900/70 hover:text-white ${pathname === link.href ? 'bg-indigo-500/10 text-indigo-300' : 'text-zinc-400'}`}>
              {link.label}
            </Link>
          ))}
          <div className="relative ml-1">
            <button type="button" onClick={() => setExploreOpen((value) => !value)} className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-zinc-400 transition-colors hover:bg-zinc-900/70 hover:text-white" aria-expanded={exploreOpen} aria-haspopup="menu">
              Explore <ChevronDown className={`h-3.5 w-3.5 transition-transform ${exploreOpen ? 'rotate-180' : ''}`} />
            </button>
            {exploreOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 rounded-2xl border border-zinc-800 bg-zinc-950/95 p-2 shadow-2xl shadow-black/30 backdrop-blur-xl" role="menu">
                {EXPLORE_LINKS.map((link) => (
                  <Link key={link.href} href={link.href} onClick={() => setExploreOpen(false)} className="block rounded-xl px-3 py-2.5 text-sm text-zinc-300 transition-colors hover:bg-zinc-900 hover:text-white" role="menuitem">
                    {link.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
          <Link href="/documentation" className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-400 transition-colors hover:bg-zinc-900/70 hover:text-white">
            Docs
          </Link>
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <Link href="/login" className="rounded-lg px-3 py-2 text-sm font-semibold text-zinc-400 transition-colors hover:text-white">Sign in</Link>
          <Link href="/login" className="sig-btn group !px-4 !py-2.5">Get started <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" /></Link>
        </div>

        <button type="button" onClick={() => setOpen((value) => !value)} className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/40 text-zinc-200 transition-colors hover:border-zinc-700 hover:bg-zinc-900 lg:hidden" aria-label={open ? 'Close navigation menu' : 'Open navigation menu'} aria-expanded={open} aria-controls="mobile-navigation">
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div id="mobile-navigation" className="border-t border-zinc-850 bg-zinc-950/95 px-5 py-4 shadow-2xl backdrop-blur-xl lg:hidden">
          <nav className="mx-auto flex max-w-7xl flex-col gap-1" aria-label="Mobile navigation">
            {[{ label: 'Features', href: anchorHref('features') }, { label: 'How it works', href: anchorHref('how') }, { label: 'Pricing', href: anchorHref('pricing') }, ...PRODUCT_LINKS, ...EXPLORE_LINKS, { label: 'Documentation', href: '/documentation' }].map((link) => (
              <Link key={link.href} href={link.href} onClick={() => setOpen(false)} className="rounded-xl px-3 py-3 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-900 hover:text-white">
                {link.label}
              </Link>
            ))}
            <div className="mt-3 grid grid-cols-2 gap-2 border-t border-zinc-800 pt-3">
              <Link href="/login" onClick={() => setOpen(false)} className="rounded-xl border border-zinc-800 px-4 py-3 text-center text-sm font-semibold text-zinc-200">Sign in</Link>
              <Link href="/login" onClick={() => setOpen(false)} className="sig-btn justify-center !py-3">Get started</Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
