"use client";

import { api } from "@/lib/api";
import {
  clearIdentityPlatformSession,
  identityPlatformErrorMessage,
  isIdentityPlatformConfigured,
  prepareGoogleSignIn,
  signInWithGooglePopup,
} from "@/lib/identityPlatform";
import { applyTheme, getStoredUser, saveAuthSession } from "@/lib/localAuth";
import { LoaderOverlay } from "@/components/Loader";
import { Brand } from "@/components/fx";
import { GoogleIcon } from "@/components/GoogleIcon";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  KeyRound,
  Mail,
  RefreshCw,
  User,
  Radio,
  ShieldCheck,
  BarChart3,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

type AuthMode = "login" | "reset" | "register" | "verify";
type PendingAction =
  "login" | "register" | "reset" | "verify" | "google" | null;

const PENDING_COPY: Record<
  Exclude<PendingAction, null>,
  { label: string; sublabel: string }
> = {
  login: {
    label: "Signing you in",
    sublabel: "Authenticating your workspace…",
  },
  google: {
    label: "Signing you in with Google",
    sublabel: "Verifying your Google identity…",
  },
  register: {
    label: "Creating your account",
    sublabel: "Setting up your ReachConvert workspace…",
  },
  verify: {
    label: "Verifying your email",
    sublabel: "Confirming your ReachConvert account…",
  },
  reset: { label: "Resetting password", sublabel: "Securing your account…" },
};

const SHOWCASE_POINTS = [
  {
    icon: Radio,
    text: "Autonomous AI calling agents that dial, qualify, and book",
  },
  { icon: BarChart3, text: "Live campaign telemetry across email and voice" },
  {
    icon: ShieldCheck,
    text: "Your contacts, templates, and history — one secure workspace",
  },
];

export default function LoginPage() {
  // useSearchParams needs a Suspense boundary for static prerendering.
  return (
    <Suspense fallback={null}>
      <LoginScreen />
    </Suspense>
  );
}

function LoginScreen() {
  const router = useRouter();
  const storedUser = getStoredUser();
  // Reset emails link to /login?resetToken=…
  const linkResetToken = useSearchParams().get("resetToken") || "";
  const [mode, setMode] = useState<AuthMode>(
    linkResetToken ? "reset" : "login",
  );
  const [name, setName] = useState("");
  const [email, setEmail] = useState(storedUser.email);
  const [password, setPassword] = useState("");
  const [resetEmail, setResetEmail] = useState(storedUser.email);
  const [resetToken, setResetToken] = useState(linkResetToken);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [verificationEmail, setVerificationEmail] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [message, setMessage] = useState("");
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const googleAvailable = isIdentityPlatformConfigured();

  useEffect(() => {
    applyTheme(storedUser.theme, storedUser.accentColor);
  }, [storedUser.accentColor, storedUser.theme]);

  useEffect(() => {
    if (googleAvailable) prepareGoogleSignIn();
  }, [googleAvailable]);

  // Drop the token from the address bar so it does not linger in history.
  useEffect(() => {
    if (linkResetToken)
      window.history.replaceState(null, "", window.location.pathname);
  }, [linkResetToken]);

  const handleLogin = (event: React.FormEvent) => {
    event.preventDefault();
    setPendingAction("login");
    api.auth
      .login({ email, password })
      .then((session) => {
        saveAuthSession(session);
        applyTheme(session.user.theme, session.user.accentColor);
        // Verification sets the HttpOnly session cookies on the response.
        // Reload the protected route so AuthGuard reads those cookies on a
        // fresh request instead of racing the client-side navigation.
        window.location.assign("/dashboard");
      })
      .catch((error: Error) => {
        setPendingAction(null);
        if (error.message.toLowerCase().includes("verify your email")) {
          openEmailVerification(email, error.message);
        } else {
          setMessage(error.message || "Invalid email or password.");
        }
      });
  };

  const handleGoogleLogin = async () => {
    setPendingAction("google");
    setMessage("");

    try {
      const idToken = await signInWithGooglePopup();
      const session = await api.auth.identityPlatform(idToken);
      saveAuthSession(session);
      applyTheme(session.user.theme, session.user.accentColor);
      router.replace("/dashboard");
    } catch (error) {
      setPendingAction(null);
      setMessage(identityPlatformErrorMessage(error));
    } finally {
      void clearIdentityPlatformSession().catch(() => undefined);
    }
  };

  const handleRegister = (event: React.FormEvent) => {
    event.preventDefault();
    if (password.length < 8) {
      setMessage("Password must be at least 8 characters.");
      return;
    }
    if (!name.trim()) {
      setMessage("Please enter your name.");
      return;
    }
    setPendingAction("register");
    api.auth
      .register({ name, email, password })
      .then((result: { email?: string; message?: string }) => {
        openEmailVerification(
          result.email || email,
          result.message || "Enter the six-digit code sent to your email.",
        );
      })
      .catch((error: Error) => {
        setPendingAction(null);
        setMessage(error.message || "Could not register.");
      });
  };

  const handleVerifyEmail = (event: React.FormEvent) => {
    event.preventDefault();
    if (!/^\d{6}$/.test(verificationCode)) {
      setMessage("Enter the six-digit verification code from your email.");
      return;
    }

    setPendingAction("verify");
    api.auth
      .verifyEmail({ email: verificationEmail, code: verificationCode })
      .then((session) => {
        saveAuthSession(session);
        applyTheme(session.user.theme, session.user.accentColor);
        router.replace("/dashboard");
      })
      .catch((error: Error) => {
        setPendingAction(null);
        setMessage(error.message || "Could not verify your email.");
      });
  };

  const handleResendVerification = () => {
    setPendingAction("verify");
    api.auth
      .resendVerification({ email: verificationEmail })
      .then((result: { message?: string }) => {
        setMessage(result.message || "A new verification code has been sent.");
      })
      .catch((error: Error) => {
        setMessage(error.message || "Could not send a new verification code.");
      })
      .finally(() => setPendingAction(null));
  };

  const handleResetRequest = (event: React.FormEvent) => {
    event.preventDefault();
    setPendingAction("reset");
    api.auth
      .forgotPassword({ email: resetEmail.trim() })
      .then((result: { message?: string }) => {
        setMessage(
          result?.message ||
            "If an account exists for that email, a reset link has been sent.",
        );
      })
      .catch((error: Error) => {
        setMessage(error.message || "Could not send reset link.");
      })
      .finally(() => {
        setPendingAction(null);
      });
  };

  const handlePasswordReset = (event: React.FormEvent) => {
    event.preventDefault();

    if (newPassword.length < 8) {
      setMessage("Password must be at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }

    setPendingAction("reset");
    api.auth
      .resetPassword({ token: resetToken, newPassword })
      .then(() => {
        setPassword(newPassword);
        setMode("login");
        setResetToken("");
        setNewPassword("");
        setConfirmPassword("");
        setMessage("Password reset. Sign in with the new password.");
      })
      .catch((error: Error) => {
        setMessage(error.message || "Could not reset password.");
      })
      .finally(() => {
        setPendingAction(null);
      });
  };

  const openReset = () => {
    setMode("reset");
    setResetEmail(email || getStoredUser().email);
    setResetToken("");
    setMessage("");
  };

  const backToLogin = () => {
    setMode("login");
    setResetToken("");
    setNewPassword("");
    setConfirmPassword("");
    setVerificationCode("");
    setMessage("");
  };

  const openEmailVerification = (targetEmail: string, notice?: string) => {
    // Registration has finished and the user must be able to interact with
    // the verification form. Leaving this set keeps LoaderOverlay mounted
    // over the OTP input indefinitely.
    setPendingAction(null);
    setVerificationEmail(targetEmail.trim().toLowerCase());
    setVerificationCode("");
    setMode("verify");
    setMessage(notice || "Enter the six-digit code sent to your email.");
  };

  const inputShell =
    "flex items-center gap-2.5 rounded-lg border border-zinc-800 bg-zinc-950/70 px-3.5 transition-colors focus-within:border-indigo-500/50";
  const inputField =
    "w-full bg-transparent py-3 text-sm text-zinc-200 outline-none";

  return (
    <main className="relative min-h-screen overflow-hidden text-zinc-100">
      <LoaderOverlay
        show={pendingAction !== null}
        label={pendingAction ? PENDING_COPY[pendingAction].label : ""}
        sublabel={
          pendingAction ? PENDING_COPY[pendingAction].sublabel : undefined
        }
      />

      {/* Ambient background */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="bg-grid mask-fade-top absolute inset-0" />
        <div
          className="animate-blob absolute -left-32 top-16 h-96 w-96 rounded-full blur-3xl"
          style={{
            background: "color-mix(in oklab, var(--a-500) 12%, transparent)",
          }}
        />
        <div
          className="animate-blob animation-delay-2000 absolute -right-20 bottom-0 h-96 w-96 rounded-full blur-3xl"
          style={{
            background: "color-mix(in oklab, var(--a2-500) 10%, transparent)",
          }}
        />
      </div>

      <div className="mx-auto grid min-h-screen w-full max-w-6xl grid-cols-1 lg:grid-cols-[1fr_460px]">
        {/* Showcase panel */}
        <section className="hidden flex-col justify-between px-8 py-10 lg:flex">
          <Link href="/" className="self-start">
            <Brand />
          </Link>

          <div className="max-w-2xl py-16">
            <p className="sig-label text-indigo-400">[ SECURE WORKSPACE ]</p>
            <h2 className="sig-display mt-5 text-5xl font-extrabold leading-[1.05] text-white">
              Sign in to run outreach that{" "}
              <span className="sig-glow bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                answers back
              </span>
              .
            </h2>

            <ul className="mt-10 space-y-4">
              {SHOWCASE_POINTS.map((point) => {
                const Icon = point.icon;
                return (
                  <li
                    key={point.text}
                    className="flex items-center gap-3 text-sm text-zinc-400"
                  >
                    <span className="flex h-9 w-9 flex-none items-center justify-center rounded-lg border border-indigo-500/20 bg-indigo-500/10 text-indigo-400">
                      <Icon className="h-4 w-4" />
                    </span>
                    {point.text}
                  </li>
                );
              })}
            </ul>

            {/* Beacon */}
            <div className="mt-14 flex items-center gap-5">
              <div className="sig-beacon flex h-12 w-12 items-center justify-center">
                <span className="h-2.5 w-2.5 rounded-full bg-indigo-400 shadow-[0_0_14px_var(--a-400)]" />
              </div>
              <p className="sig-label text-zinc-600">
                SIGNAL ACTIVE · CAMPAIGNS SYNCED IN REAL TIME
              </p>
            </div>
          </div>

          <p className="sig-label text-zinc-700">
            REACHCONVERT // AI OUTREACH SUITE
          </p>
        </section>

        {/* Auth panel */}
        <section className="flex items-center px-5 py-8 sm:px-6 lg:py-10">
          <div className="sig-card sig-ticks sig-ticks-on w-full rounded-2xl p-6 sm:p-8">
            <Link href="/" className="mb-8 inline-block lg:hidden">
              <Brand />
            </Link>

            {mode === "login" ? (
              <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-2">
                  <h2 className="sig-display text-2xl font-extrabold text-white">
                    Welcome back
                  </h2>
                  <p className="text-sm text-zinc-500">
                    Sign in with your ReachConvert account.
                  </p>
                </div>
                <div>
                  <label className="sig-label mb-2 block text-zinc-500">
                    Email
                  </label>
                  <div className={inputShell}>
                    <Mail className="h-4 w-4 flex-none text-zinc-600" />
                    <input
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      className={inputField}
                    />
                  </div>
                </div>
                <div>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <label className="sig-label block text-zinc-500">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={openReset}
                      className="text-xs font-semibold text-indigo-400 transition-colors hover:text-indigo-300"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className={inputShell}>
                    <KeyRound className="h-4 w-4 flex-none text-zinc-600" />
                    <input
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      className={inputField}
                    />
                  </div>
                </div>
                <span className="sig-btn-wrap w-full">
                  <button
                    type="submit"
                    disabled={pendingAction !== null}
                    className="sig-btn w-full disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Sign In <ArrowRight className="h-4 w-4" />
                  </button>
                </span>
                {googleAvailable && (
                  <>
                    <div className="flex items-center gap-3 text-[10px] uppercase tracking-[0.22em] text-zinc-700">
                      <span className="h-px flex-1 bg-zinc-800" />
                      or
                      <span className="h-px flex-1 bg-zinc-800" />
                    </div>
                    <button
                      type="button"
                      onClick={handleGoogleLogin}
                      disabled={pendingAction !== null}
                      className="sig-btn-ghost w-full disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <GoogleIcon className="h-4 w-4" /> Continue with Google
                    </button>
                  </>
                )}
                <div className="pt-2 text-center text-sm text-zinc-500">
                  Don&apos;t have an account?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setMode("register");
                      setMessage("");
                    }}
                    className="font-semibold text-indigo-400 hover:text-indigo-300"
                  >
                    Sign up
                  </button>
                </div>
              </form>
            ) : mode === "register" ? (
              <form onSubmit={handleRegister} className="space-y-5">
                <div className="space-y-2">
                  <h2 className="sig-display text-2xl font-extrabold text-white">
                    Create an account
                  </h2>
                  <p className="text-sm text-zinc-500">
                    Get started with ReachConvert today.
                  </p>
                </div>
                <div>
                  <label className="sig-label mb-2 block text-zinc-500">
                    Name
                  </label>
                  <div className={inputShell}>
                    <User className="h-4 w-4 flex-none text-zinc-600" />
                    <input
                      type="text"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      className={inputField}
                    />
                  </div>
                </div>
                <div>
                  <label className="sig-label mb-2 block text-zinc-500">
                    Email
                  </label>
                  <div className={inputShell}>
                    <Mail className="h-4 w-4 flex-none text-zinc-600" />
                    <input
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      className={inputField}
                    />
                  </div>
                </div>
                <div>
                  <label className="sig-label mb-2 block text-zinc-500">
                    Password
                  </label>
                  <div className={inputShell}>
                    <KeyRound className="h-4 w-4 flex-none text-zinc-600" />
                    <input
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      className={inputField}
                    />
                  </div>
                </div>
                <span className="sig-btn-wrap w-full">
                  <button
                    type="submit"
                    disabled={pendingAction !== null}
                    className="sig-btn w-full disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Create Account <ArrowRight className="h-4 w-4" />
                  </button>
                </span>
                <div className="pt-2 text-center text-sm text-zinc-500">
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setMode("login");
                      setMessage("");
                    }}
                    className="font-semibold text-indigo-400 hover:text-indigo-300"
                  >
                    Sign in
                  </button>
                </div>
              </form>
            ) : mode === "verify" ? (
              <form onSubmit={handleVerifyEmail} className="space-y-5">
                <button
                  type="button"
                  onClick={backToLogin}
                  className="sig-label flex items-center gap-1.5 text-zinc-500 transition-colors hover:text-zinc-300"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Back to login
                </button>
                <div className="space-y-2">
                  <h2 className="sig-display text-2xl font-extrabold text-white">
                    Verify your email
                  </h2>
                  <p className="text-sm leading-6 text-zinc-500">
                    We sent a six-digit code to finish creating your account.
                  </p>
                </div>
                <div>
                  <label className="sig-label mb-2 block text-zinc-500">
                    Email
                  </label>
                  <div className={inputShell}>
                    <Mail className="h-4 w-4 flex-none text-zinc-600" />
                    <input
                      type="email"
                      value={verificationEmail}
                      onChange={(event) =>
                        setVerificationEmail(event.target.value)
                      }
                      className={inputField}
                    />
                  </div>
                </div>
                <div>
                  <label className="sig-label mb-2 block text-zinc-500">
                    Verification Code
                  </label>
                  <div className={inputShell}>
                    <ShieldCheck className="h-4 w-4 flex-none text-zinc-600" />
                    <input
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={6}
                      value={verificationCode}
                      onChange={(event) =>
                        setVerificationCode(
                          event.target.value.replace(/\D/g, ""),
                        )
                      }
                      className={`${inputField} tracking-[0.35em]`}
                    />
                  </div>
                </div>
                <span className="sig-btn-wrap w-full">
                  <button
                    type="submit"
                    disabled={pendingAction !== null}
                    className="sig-btn w-full disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Verify Email <ArrowRight className="h-4 w-4" />
                  </button>
                </span>
                <button
                  type="button"
                  onClick={handleResendVerification}
                  disabled={pendingAction !== null}
                  className="sig-btn-ghost w-full disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <RefreshCw className="h-4 w-4" /> Resend Code
                </button>
              </form>
            ) : (
              <div className="space-y-5">
                <button
                  type="button"
                  onClick={backToLogin}
                  className="sig-label flex items-center gap-1.5 text-zinc-500 transition-colors hover:text-zinc-300"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Back to login
                </button>
                <div className="space-y-2">
                  <h2 className="sig-display text-2xl font-extrabold text-white">
                    Reset password
                  </h2>
                  <p className="text-sm leading-6 text-zinc-500">
                    {resetToken
                      ? "Choose a new password for your account."
                      : "Enter your account email and we will send you a link to reset your password."}
                  </p>
                </div>
                {!resetToken && (
                  <form onSubmit={handleResetRequest} className="space-y-4">
                    <div>
                      <label className="sig-label mb-2 block text-zinc-500">
                        Account Email
                      </label>
                      <div className={inputShell}>
                        <Mail className="h-4 w-4 flex-none text-zinc-600" />
                        <input
                          type="email"
                          value={resetEmail}
                          onChange={(event) =>
                            setResetEmail(event.target.value)
                          }
                          className={inputField}
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={pendingAction !== null}
                      className="sig-btn-ghost w-full disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <RefreshCw className="h-4 w-4" /> Send Reset Link
                    </button>
                  </form>
                )}

                {resetToken && (
                  <form onSubmit={handlePasswordReset} className="space-y-4">
                    <div>
                      <label className="sig-label mb-2 block text-zinc-500">
                        New Password
                      </label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(event) => setNewPassword(event.target.value)}
                        className="w-full rounded-lg border border-zinc-800 bg-zinc-950/70 px-3.5 py-3 text-sm text-zinc-200 outline-none transition-colors focus:border-indigo-500/50"
                      />
                    </div>
                    <div>
                      <label className="sig-label mb-2 block text-zinc-500">
                        Confirm Password
                      </label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(event) =>
                          setConfirmPassword(event.target.value)
                        }
                        className="w-full rounded-lg border border-zinc-800 bg-zinc-950/70 px-3.5 py-3 text-sm text-zinc-200 outline-none transition-colors focus:border-indigo-500/50"
                      />
                    </div>
                    <span className="sig-btn-wrap w-full">
                      <button
                        type="submit"
                        disabled={pendingAction !== null}
                        className="sig-btn w-full disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Save New Password
                      </button>
                    </span>
                  </form>
                )}
              </div>
            )}

            {message && (
              <div className="animate-in mt-5 rounded-lg border border-indigo-500/20 bg-indigo-500/5 px-4 py-3 text-xs font-semibold text-zinc-300">
                {message}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
