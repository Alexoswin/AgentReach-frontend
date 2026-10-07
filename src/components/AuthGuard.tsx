'use client';

import { api, ApiError } from '@/lib/api';
import { applyTheme, saveStoredUser, signOut } from '@/lib/localAuth';
import { LoadingScreen } from '@/components/Loader';
import { RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

type SessionState = 'checking' | 'allowed' | 'unreachable';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<SessionState>('checking');

  const verifySession = useCallback(() => {
    api.auth.me()
      .then((user) => {
        saveStoredUser(user);
        applyTheme(user.theme, user.accentColor);
        setState('allowed');
      })
      .catch((error: unknown) => {
        // Only a 401 means the session is gone. A timeout or network error
        // (e.g. the backend waking from scale-to-zero) used to sign people
        // out too; offer a retry instead.
        if (error instanceof ApiError && error.status === 401) {
          signOut();
          router.replace('/login');
          return;
        }
        setState('unreachable');
      });
  }, [router]);

  useEffect(() => {
    verifySession();
  }, [verifySession]);

  if (state === 'unreachable') {
    return (
      <div className="flex min-h-screen items-center justify-center px-5 text-zinc-100">
        <div className="sig-card w-full max-w-sm rounded-2xl p-6 text-center">
          <h2 className="sig-display text-lg font-bold text-white">We could not reach the server</h2>
          <p className="mt-2 text-sm text-zinc-500">Your session is still saved. Check your connection and try again.</p>
          <button
            type="button"
            onClick={() => {
              setState('checking');
              verifySession();
            }}
            className="sig-btn mt-5 w-full"
          >
            <RefreshCw className="h-4 w-4" /> Retry
          </button>
        </div>
      </div>
    );
  }

  if (state === 'checking') {
    return <LoadingScreen label="Checking session" sublabel="Verifying your workspace access" />;
  }

  return children;
}
