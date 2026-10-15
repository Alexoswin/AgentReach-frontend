import { NO_INDEX } from '@/lib/seo';

export const metadata = { title: 'Signing in — ReachConvert', ...NO_INDEX };

export default function AuthCallbackLayout({ children }: { children: React.ReactNode }) {
  return children;
}
