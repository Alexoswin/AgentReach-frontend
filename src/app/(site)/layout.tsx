import SiteFooter from '@/components/SiteFooter';
import PublicHeader from '@/components/PublicHeader';

/** Shared chrome for public, non-landing pages (contribute, contact, support). */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col overflow-x-hidden text-zinc-100">
      <PublicHeader />

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
