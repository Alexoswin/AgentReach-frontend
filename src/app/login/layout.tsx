import { NO_INDEX } from '@/lib/seo';

// The login page is a client component, so its metadata lives here.
export const metadata = { title: 'Sign in — ReachConvert', ...NO_INDEX };

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
