import AuthGuard from '@/components/AuthGuard';
import AppShell from '@/components/AppShell';
import { NO_INDEX } from '@/lib/seo';

export const metadata = NO_INDEX;

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <AppShell>{children}</AppShell>
    </AuthGuard>
  );
}
