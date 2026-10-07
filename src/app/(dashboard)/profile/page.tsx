'use client';

import { api } from '@/lib/api';
import {
  clearIdentityPlatformSession,
  identityPlatformErrorMessage,
  isIdentityPlatformConfigured,
  signInWithGooglePopup,
} from '@/lib/identityPlatform';
import {
  ACCENT_OPTIONS,
  applyTheme,
  getStoredUser,
  LocalUserProfile,
  saveStoredUser,
  THEME_OPTIONS,
  ThemeMode,
} from '@/lib/localAuth';
import { useOutreachStore } from '@/store/useOutreachStore';
import { PageLoader } from '@/components/Loader';
import { GoogleIcon } from '@/components/GoogleIcon';
import { Check, Mail, Monitor, Moon, Palette, Save, Sun, UserRound } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';

// Swatches pair the default dark (Void) and light (Porcelain) backgrounds it switches between.
const SYSTEM_THEME_OPTION = {
  id: 'system' as const,
  name: 'Match system',
  swatches: ['#060b0d', '#f3f5f7', '#3fd0ff'],
};

export default function ProfilePage() {
  const { showAlert } = useOutreachStore();
  const [profile, setProfile] = useState<LocalUserProfile | null>(() => getStoredUser());
  const [password, setPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [linkingGoogle, setLinkingGoogle] = useState(false);

  // Theme picks preview live but only persist on Save; leaving the page
  // drops an unsaved preview so the app matches the stored preference.
  useEffect(() => {
    return () => {
      const stored = getStoredUser();
      applyTheme(stored.theme, stored.accentColor);
    };
  }, []);

  const updateProfile = <K extends keyof LocalUserProfile>(key: K, value: LocalUserProfile[K]) => {
    setProfile((current) => {
      if (!current) return current;
      const next = { ...current, [key]: value };
      if (key === 'theme' || key === 'accentColor') {
        applyTheme(next.theme, next.accentColor);
      }
      return next;
    });
  };

  const handleSave = (event: React.FormEvent) => {
    event.preventDefault();

    if (!profile) return;

    if (!profile.email.trim() || !profile.name.trim()) {
      showAlert('Please enter your name and email before saving.', 'error');
      return;
    }

    const name = profile.name.trim();
    const initialsFromName = name
      .split(/\s+/)
      .map((part) => part[0])
      .join('');
    const nextProfile = {
      ...profile,
      email: profile.email.trim(),
      name,
      initials: (profile.initials.trim() || initialsFromName).slice(0, 3).toUpperCase(),
    };

    // Changing the password or sign-in email needs the current password.
    const emailChanged =
      nextProfile.email.toLowerCase() !== getStoredUser().email.toLowerCase();
    if ((password || emailChanged) && !currentPassword) {
      showAlert('Enter your current password to change your password or email.', 'error');
      return;
    }

    api.auth.updateProfile({
      ...nextProfile,
      ...(password ? { password } : {}),
      ...(password || emailChanged ? { currentPassword } : {}),
    })
      .then((updatedProfile) => {
        saveStoredUser(updatedProfile);
        applyTheme(updatedProfile.theme, updatedProfile.accentColor);
        setProfile(updatedProfile);
        setPassword('');
        setCurrentPassword('');
        showAlert(
          emailChanged
            ? `Profile updated. We sent a code to ${updatedProfile.email}; you'll enter it the next time you sign in.`
            : 'Profile updated successfully.',
          'success',
        );
      })
      .catch((error: Error) => {
        showAlert(error.message || 'We could not update your profile. Please try again.', 'error');
      });
  };

  const handleLinkGoogle = async () => {
    setLinkingGoogle(true);
    try {
      const idToken = await signInWithGooglePopup();
      const updatedProfile = await api.auth.linkGoogle(idToken);
      saveStoredUser(updatedProfile);
      setProfile(updatedProfile);
      showAlert('Google sign-in is now linked to this account.', 'success');
    } catch (error) {
      showAlert(
        identityPlatformErrorMessage(error),
        'error',
      );
    } finally {
      await clearIdentityPlatformSession().catch(() => undefined);
      setLinkingGoogle(false);
    }
  };

  if (!profile) {
    return <PageLoader label="Loading profile" sublabel="Fetching your workspace identity" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 border-b border-zinc-900 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-3 text-3xl font-extrabold tracking-tight text-white">
            <UserRound className="h-8 w-8 text-indigo-400" />
            User Profile
          </h2>
          <p className="mt-1 text-sm text-zinc-400">Manage your account identity and workspace appearance.</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="grid grid-cols-1 gap-6 lg:grid-cols-[300px_1fr]">
        <section className="rounded-2xl border border-zinc-850 bg-zinc-900/40 p-6 shadow-xl">
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 text-2xl font-black text-white shadow-lg shadow-indigo-500/20">
            {profile.initials}
          </div>
          <div className="mt-5 text-center">
            <h3 className="text-lg font-bold text-white">{profile.name}</h3>
            <p className="mt-1 text-xs text-zinc-500">{profile.email}</p>
          </div>
          <div className="mt-6 rounded-xl border border-zinc-800 bg-zinc-950 p-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-400">
              <Palette className="h-3.5 w-3.5 text-indigo-400" />
              Selected look
            </div>
            <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-900 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-white">Campaign Panel</p>
                  <p className="text-xs text-zinc-500">Preview of buttons and highlights</p>
                </div>
                <span className="h-3 w-3 rounded-full bg-indigo-500" />
              </div>
              <button
                type="button"
                className="mt-4 w-full rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-indigo-500/20"
              >
                Primary Button
              </button>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-850 bg-zinc-900/40 p-6 shadow-xl">
          <div className="mb-6 space-y-5 border-b border-zinc-850 pb-6">
            <ThemeGroup
              title="Automatic"
              icon={<Monitor className="h-4 w-4 text-indigo-400" />}
              themes={[SYSTEM_THEME_OPTION]}
              selectedTheme={profile.theme}
              onSelect={(theme) => updateProfile('theme', theme)}
            />
            <ThemeGroup
              title="Dark themes"
              icon={<Moon className="h-4 w-4 text-indigo-400" />}
              themes={THEME_OPTIONS.filter((theme) => theme.mode === 'dark')}
              selectedTheme={profile.theme}
              onSelect={(theme) => updateProfile('theme', theme)}
            />
            <ThemeGroup
              title="Light themes"
              icon={<Sun className="h-4 w-4 text-indigo-400" />}
              themes={THEME_OPTIONS.filter((theme) => theme.mode === 'light')}
              selectedTheme={profile.theme}
              onSelect={(theme) => updateProfile('theme', theme)}
            />

            <div>
              <div className="mb-3 flex items-center gap-2">
                <Palette className="h-4 w-4 text-indigo-400" />
                <h3 className="text-sm font-bold text-white">Button and element colours</h3>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                {ACCENT_OPTIONS.map((accent) => (
                  <button
                    key={accent.id}
                    type="button"
                    onClick={() => updateProfile('accentColor', accent.id)}
                    className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-xs font-bold transition ${
                      profile.accentColor === accent.id
                        ? 'border-indigo-500 bg-zinc-950 text-white'
                        : 'border-zinc-800 bg-zinc-950/50 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                    }`}
                  >
                    <span className="h-4 w-4 rounded-full" style={{ backgroundColor: accent.value }} />
                    {accent.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <ProfileField label="Full Name" value={profile.name} onChange={(value) => updateProfile('name', value)} />
            <ProfileField label="Initials" value={profile.initials} onChange={(value) => updateProfile('initials', value)} />
            <ProfileField label="Email" type="email" value={profile.email} onChange={(value) => updateProfile('email', value)} />
            <ProfileField label="Phone" value={profile.phone} onChange={(value) => updateProfile('phone', value)} />
            <ProfileField label="Title" value={profile.title} onChange={(value) => updateProfile('title', value)} />
            <ProfileField label="Company" value={profile.company} onChange={(value) => updateProfile('company', value)} />
            <ProfileField
              label="New Password"
              type="password"
              value={password}
              onChange={setPassword}
              placeholder="Leave blank to keep current password"
            />
            <ProfileField
              label="Current Password"
              type="password"
              value={currentPassword}
              onChange={setCurrentPassword}
              placeholder="Needed to change your password or email"
            />
          </div>

          {isIdentityPlatformConfigured() && (
            <div className="mt-6 flex flex-col gap-3 rounded-xl border border-zinc-800 bg-zinc-950/60 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2 text-sm font-bold text-white">
                  <GoogleIcon className="h-4 w-4" />
                  Google sign-in
                </div>
                <p className="mt-1 text-xs leading-5 text-zinc-500">
                  {profile.authProvider?.includes('google')
                    ? 'Google is linked to this account.'
                    : 'Link the matching Google account so you can use SSO on the login page.'}
                </p>
              </div>
              {!profile.authProvider?.includes('google') && (
                <button
                  type="button"
                  onClick={handleLinkGoogle}
                  disabled={linkingGoogle}
                  className="sig-btn-ghost shrink-0 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <GoogleIcon className="h-4 w-4" />
                  {linkingGoogle ? 'Connecting…' : 'Connect Google'}
                </button>
              )}
            </div>
          )}

          <div className="mt-6 flex justify-end border-t border-zinc-850 pt-5">
            <button
              type="submit"
              className="flex items-center gap-2 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-indigo-500/20"
            >
              <Save className="h-3.5 w-3.5" />
              Save Profile
            </button>
          </div>
        </section>
      </form>

      <div className="flex items-center gap-2 rounded-2xl border border-zinc-850 bg-zinc-900/30 p-4 text-xs text-zinc-500">
        <Mail className="h-4 w-4 text-zinc-500" />
        Password reset uses the account email saved in this profile.
      </div>
    </div>
  );
}

function ThemeGroup({
  title,
  icon,
  themes,
  selectedTheme,
  onSelect,
}: {
  title: string;
  icon: ReactNode;
  themes: { id: ThemeMode; name: string; swatches: string[] }[];
  selectedTheme: ThemeMode;
  onSelect: (theme: ThemeMode) => void;
}) {
  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        {icon}
        <h3 className="text-sm font-bold text-white">{title}</h3>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {themes.map((theme) => {
          const selected = selectedTheme === theme.id;
          return (
            <button
              key={theme.id}
              type="button"
              onClick={() => onSelect(theme.id)}
              className={`rounded-xl border p-3 text-left transition ${
                selected
                  ? 'border-indigo-500 bg-zinc-950 text-white shadow-lg shadow-indigo-500/10'
                  : 'border-zinc-800 bg-zinc-950/50 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-bold">{theme.name}</span>
                {selected ? <Check className="h-4 w-4 text-indigo-400" /> : null}
              </div>
              <div className="mt-3 grid grid-cols-3 overflow-hidden rounded-lg border border-zinc-800">
                {theme.swatches.map((color) => (
                  <span key={color} className="h-8" style={{ backgroundColor: color }} />
                ))}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ProfileField({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-zinc-400">{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-zinc-200 outline-none focus:border-indigo-500/50"
      />
    </label>
  );
}
