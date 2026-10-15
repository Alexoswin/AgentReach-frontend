"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { completeGoogleSignIn } from "@/lib/cognitoAuth";
import { applyTheme, saveAuthSession } from "@/lib/localAuth";
import { LoadingScreen } from "@/components/Loader";

/** Where Google sign-in through AWS Cognito lands, for sign-in and for linking. */
function GoogleCallback() {
  const searchParams = useSearchParams();
  const [error, setError] = useState("");
  const [linking, setLinking] = useState(false);
  // The code can be exchanged only once; React runs effects twice in development.
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    completeGoogleSignIn(new URLSearchParams(searchParams.toString()))
      .then(async ({ idToken, nonce, purpose, returnTo }) => {
        if (purpose === "link") {
          setLinking(true);
          const session = await api.auth.linkCognito(idToken, nonce);
          saveAuthSession(session);
          window.location.replace(`${returnTo}${returnTo.includes("?") ? "&" : "?"}google=linked`);
          return;
        }
        const session = await api.auth.cognito(idToken, nonce);
        saveAuthSession(session);
        applyTheme(session.user.theme, session.user.accentColor);
        // A full load, so AuthGuard reads the new session cookies.
        window.location.replace(returnTo);
      })
      .catch((reason: unknown) => {
        setError(reason instanceof Error && reason.message ? reason.message : "Could not sign in with Google.");
      });
  }, [searchParams]);

  if (!error) {
    return (
      <LoadingScreen
        label={linking ? "Linking Google" : "Signing you in"}
        sublabel="Finishing Google sign-in…"
      />
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-4">
      <div className="w-full max-w-sm space-y-4 rounded-2xl border border-zinc-850 bg-zinc-900/60 p-6 text-center">
        <h1 className="text-lg font-bold text-white">Google sign-in didn&apos;t finish</h1>
        <p className="text-sm text-zinc-400">{error}</p>
        <Link href="/login" className="inline-block text-sm font-semibold text-indigo-300 hover:text-indigo-200">
          Back to sign in
        </Link>
      </div>
    </main>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<LoadingScreen label="Signing you in" />}>
      <GoogleCallback />
    </Suspense>
  );
}
