'use client';

import { api } from '@/lib/api';
import { applyTheme, saveStoredUser, signOut } from '@/lib/localAuth';
import { LoadingScreen } from '@/components/Loader';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    api.auth.me()
      .then((user) => {
        saveStoredUser(user);
        applyTheme(user.theme, user.accentColor);
        setAllowed(true);
      })
      .catch(() => {
        signOut();
        router.replace('/login');
      });
  }, [router]);

  if (!allowed) {
    return <LoadingScreen label="Checking session" sublabel="Verifying your workspace access" />;
  }

  return children;
}
