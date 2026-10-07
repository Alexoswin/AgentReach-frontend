import Link from 'next/link';
import { Brand } from '@/components/fx';
import { LICENSE_NAME, LICENSE_URL, SITE_LINKS } from '@/lib/site';

/** Public-site footer shared by the landing page and the (site) pages. */
export default function SiteFooter() {
  return (
    <footer className="border-t border-zinc-850 px-5 py-12 sm:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-between gap-6 lg:flex-row">
        <Link href="/">
          <Brand />
        </Link>
        <nav className="sig-label flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-zinc-500">
          {SITE_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="transition-colors hover:text-indigo-300">
              {link.label}
            </Link>
          ))}
        </nav>
        <p className="sig-label text-zinc-600">
          © {new Date().getFullYear()} REACHCONVERT ·{' '}
          <a
            href={LICENSE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-indigo-300"
          >
            {LICENSE_NAME}
          </a>
        </p>
      </div>
    </footer>
  );
}
