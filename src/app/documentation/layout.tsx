import type { Metadata } from 'next';
import Link from 'next/link';
import { Zap, ArrowLeft } from 'lucide-react';
import DocSidebar from './DocSidebar';

export const metadata: Metadata = {
  title: 'Documentation — ReachConvert',
  description: 'Detailed guides for every ReachConvert feature.',
};

export default function DocumentationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-zinc-900 bg-zinc-950/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[88rem] items-center justify-between px-5 sm:px-8">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 shadow-lg shadow-indigo-500/20">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <div className="leading-tight">
              <h1 className="text-base font-bold tracking-tight text-white">ReachConvert Docs</h1>
              <p className="-mt-0.5 text-[10px] font-medium uppercase tracking-widest text-zinc-500">
                Product documentation
              </p>
            </div>
          </Link>
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-2 text-sm font-semibold text-zinc-200 transition-colors hover:bg-zinc-900"
          >
            <ArrowLeft className="h-4 w-4" /> Back to app
          </Link>
        </div>
      </header>

      <div className="mx-auto flex max-w-[88rem] gap-0 px-0 sm:px-4">
        <DocSidebar />
        <main className="min-w-0 flex-1 px-5 py-10 sm:px-10">{children}</main>
      </div>
    </div>
  );
}
