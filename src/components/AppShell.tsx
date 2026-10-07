'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import Alert from '@/components/Alert';
import { BrandMark } from '@/components/fx';
import { lockBodyScroll } from '@/lib/scrollLock';

/**
 * Responsive dashboard chrome: a sticky sidebar rail on desktop and a
 * top bar + slide-in drawer on smaller screens, with an animated
 * route-change transition on the content area.
 */
export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  // The drawer belongs to the route it was opened on, so navigating closes
  // it without an effect.
  const [drawerPath, setDrawerPath] = useState<string | null>(null);
  const drawerOpen = drawerPath === pathname;
  const setDrawerOpen = (open: boolean) => setDrawerPath(open ? pathname : null);

  // Lock scroll while the drawer is open.
  useEffect(() => {
    if (!drawerOpen) return;
    const unlockScroll = lockBodyScroll();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setDrawerPath(null);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      unlockScroll();
      window.removeEventListener('keydown', onKey);
    };
  }, [drawerOpen]);

  return (
    <div className="flex min-h-screen text-zinc-100">
      {/* Desktop rail */}
      <aside className="sticky top-0 hidden h-screen w-[264px] flex-none border-r border-zinc-850 bg-zinc-950/40 backdrop-blur-sm lg:block">
        <Sidebar />
      </aside>

      {/* Mobile drawer */}
      <div
        className={`fixed inset-0 z-50 lg:hidden ${drawerOpen ? '' : 'pointer-events-none'}`}
        // inert also takes the off-screen links out of the tab order.
        inert={!drawerOpen}
      >
        <div
          onClick={() => setDrawerOpen(false)}
          className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
            drawerOpen ? 'opacity-100' : 'opacity-0'
          }`}
        />
        <div
          className={`absolute inset-y-0 left-0 w-[290px] max-w-[85vw] border-r border-zinc-850 bg-zinc-950 shadow-2xl transition-transform duration-300 ease-out ${
            drawerOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <button
            type="button"
            onClick={() => setDrawerOpen(false)}
            aria-label="Close menu"
            className="absolute right-3 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-800 text-zinc-400 transition-colors hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
          <Sidebar onNavigate={() => setDrawerOpen(false)} />
        </div>
      </div>

      {/* Content column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-zinc-850 bg-zinc-950/80 px-4 backdrop-blur-xl lg:hidden">
          <Link href="/" className="flex items-center gap-2.5">
            <BrandMark size={30} />
            <span className="sig-display text-base font-bold tracking-tight text-white">
              ReachConvert
            </span>
          </Link>
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open menu"
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-800 text-zinc-300 transition-colors hover:border-indigo-500/40 hover:text-white"
          >
            <Menu className="h-5 w-5" />
          </button>
        </header>

        <main className="w-full flex-1 overflow-y-auto px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          <div key={pathname} className="sig-page mx-auto w-full max-w-6xl">
            {children}
          </div>
        </main>
      </div>

      <Alert />
    </div>
  );
}
