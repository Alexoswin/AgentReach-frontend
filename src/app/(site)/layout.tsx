import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Brand } from '@/components/fx';
import SiteFooter from '@/components/SiteFooter';

const HEADER_LINKS = [
  { label: 'Docs', href: '/documentation' },
  { label: 'Contribute', href: '/contribute' },
  { label: 'Contact', href: '/contact' },
];

/** Shared chrome for public, non-landing pages (contribute, contact). */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col overflow-x-hidden text-zinc-100">
      <header className="sticky top-0 z-40 border-b border-zinc-850 bg-zinc-950/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-5 sm:px-8">
          <Link href="/">
            <Brand />
          </Link>
          <nav className="flex items-center gap-1">
            {HEADER_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="sig-label hidden rounded-lg px-4 py-2 text-zinc-500 transition-colors hover:text-indigo-300 sm:inline-flex"
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/"
              className="flex items-center gap-1.5 rounded-lg border border-zinc-800 px-3 py-2 text-sm font-semibold text-zinc-300 transition-colors hover:text-white sm:hidden"
            >
              <ArrowLeft className="h-4 w-4" /> Home
            </Link>
            {/* .sig-btn-wrap sets its own display, so visibility is toggled on a wrapper */}
            <div className="ml-2 hidden sm:block">
              <span className="sig-btn-wrap">
                <Link href="/login" className="sig-btn !px-5 !py-2.5">
                  Sign in
                </Link>
              </span>
            </div>
          </nav>
        </div>
      </header>

      <main className="relative isolate flex-1">
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[36rem]">
          <div className="bg-grid mask-fade-top absolute inset-0" />
        </div>
        {children}
      </main>

      <SiteFooter />
    </div>
  );
}
