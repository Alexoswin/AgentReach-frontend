/** 'system' follows the OS light/dark setting (see resolveTheme). */
export type ThemeMode =
  | 'system'
  | 'dark-midnight'
  | 'dark-slate'
  | 'dark-graphite'
  | 'dark-violet'
  | 'light-cloud'
  | 'light-paper'
  | 'light-mint'
  | 'light-rose';

export type AccentColor = 'volt' | 'emerald' | 'sky' | 'rose' | 'amber' | 'violet';

export const THEME_OPTIONS: { id: ThemeMode; name: string; mode: 'dark' | 'light'; swatches: string[] }[] = [
  { id: 'dark-midnight', name: 'Void', mode: 'dark', swatches: ['#060b0d', '#101b1f', '#3fd0ff'] },
  { id: 'dark-slate', name: 'Deepwater', mode: 'dark', swatches: ['#05090f', '#101a2a', '#3fd0ff'] },
  { id: 'dark-graphite', name: 'Carbon', mode: 'dark', swatches: ['#0a0a0a', '#212121', '#fcc63d'] },
  { id: 'dark-violet', name: 'Nebula', mode: 'dark', swatches: ['#0b0713', '#1a122e', '#b79cfe'] },
  { id: 'light-cloud', name: 'Porcelain', mode: 'light', swatches: ['#f3f5f7', '#ffffff', '#4a6309'] },
  { id: 'light-paper', name: 'Parchment', mode: 'light', swatches: ['#f5f0e5', '#fdfaf2', '#9a6b03'] },
  { id: 'light-mint', name: 'Greenhouse', mode: 'light', swatches: ['#edf9f3', '#ffffff', '#0b7d55'] },
  { id: 'light-rose', name: 'Blush', mode: 'light', swatches: ['#fcf1f3', '#ffffff', '#c03d1e'] },
];

export const ACCENT_OPTIONS: { id: AccentColor; name: string; value: string }[] = [
  { id: 'sky', name: 'Cyan', value: '#3fd0ff' },
  { id: 'volt', name: 'Volt', value: '#c8f542' },
  { id: 'emerald', name: 'Mint', value: '#37e8a6' },
  { id: 'rose', name: 'Coral', value: '#ff8a6b' },
  { id: 'amber', name: 'Solar', value: '#fcc63d' },
  { id: 'violet', name: 'Orchid', value: '#b79cfe' },
];

export interface LocalUserProfile {
  id?: string;
  email: string;
  name: string;
  initials: string;
  title: string;
  company: string;
  phone: string;
  theme: ThemeMode;
  accentColor: AccentColor;
}

export const AUTH_USER_KEY = 'reachconvert_user';
export const ACCESS_TOKEN_KEY = 'reachconvert_access_token';
export const REFRESH_TOKEN_KEY = 'reachconvert_refresh_token';

export const DEFAULT_USER: LocalUserProfile = {
  email: '',
  name: '',
  initials: '',
  title: '',
  company: '',
  phone: '',
  theme: 'system',
  accentColor: 'sky',
};

const PREFERS_LIGHT_QUERY = '(prefers-color-scheme: light)';

function normalizeTheme(theme?: string): ThemeMode {
  if (theme === 'dark') return 'dark-midnight';
  if (theme === 'light') return 'light-cloud';
  if (theme === 'system') return 'system';
  return THEME_OPTIONS.some((option) => option.id === theme) ? (theme as ThemeMode) : DEFAULT_USER.theme;
}

/** Maps 'system' to the default dark or light theme for the current OS setting. */
export function resolveTheme(theme: ThemeMode): ThemeMode {
  if (theme !== 'system') return theme;
  const prefersLight = typeof window !== 'undefined' && window.matchMedia(PREFERS_LIGHT_QUERY).matches;
  return prefersLight ? 'light-cloud' : 'dark-midnight';
}

function normalizeAccent(accent?: string): AccentColor {
  // 'indigo' was the pre-redesign default accent id; migrate it to the new default.
  if (accent === 'indigo') return 'sky';
  return ACCENT_OPTIONS.some((option) => option.id === accent) ? (accent as AccentColor) : DEFAULT_USER.accentColor;
}

function normalizeUser(user: Partial<LocalUserProfile>): LocalUserProfile {
  return {
    ...DEFAULT_USER,
    ...user,
    // Signed-out visitors have no way to pick a theme, so a stored theme without an
    // account email is a leftover default (formerly dark) — follow the system instead.
    theme: user.email ? normalizeTheme(user.theme) : 'system',
    accentColor: normalizeAccent(user.accentColor),
  };
}

export function getThemeFamily(theme: ThemeMode) {
  const resolved = resolveTheme(theme);
  return THEME_OPTIONS.find((option) => option.id === resolved)?.mode || 'dark';
}

export function getStoredUser(): LocalUserProfile {
  if (typeof window === 'undefined') {
    return DEFAULT_USER;
  }

  const stored = window.localStorage.getItem(AUTH_USER_KEY);
  if (!stored) {
    window.localStorage.setItem(AUTH_USER_KEY, JSON.stringify(DEFAULT_USER));
    return DEFAULT_USER;
  }

  try {
    const user = normalizeUser(JSON.parse(stored));
    window.localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
    return user;
  } catch {
    window.localStorage.setItem(AUTH_USER_KEY, JSON.stringify(DEFAULT_USER));
    return DEFAULT_USER;
  }
}

export function saveStoredUser(user: LocalUserProfile) {
  window.localStorage.setItem(AUTH_USER_KEY, JSON.stringify(normalizeUser(user)));
  window.dispatchEvent(new Event('reachconvert:user-updated'));
}

export function isAuthenticated() {
  return typeof window !== 'undefined' && !!getAccessToken() && !!getRefreshToken();
}

export function saveAuthSession(tokens: { accessToken: string; refreshToken: string; user: LocalUserProfile }) {
  window.localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
  window.localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
  saveStoredUser(tokens.user);
}

export function signOut() {
  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export function getAccessToken() {
  return typeof window === 'undefined' ? null : window.localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken() {
  return typeof window === 'undefined' ? null : window.localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function saveTokens(accessToken: string, refreshToken: string) {
  window.localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  window.localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

// The last applied preference, so an OS light/dark switch can re-apply a 'system' theme.
let appliedPreference: { theme: ThemeMode; accentColor: AccentColor } | null = null;

export function applyTheme(theme: ThemeMode, accentColor: AccentColor = DEFAULT_USER.accentColor) {
  const normalizedTheme = normalizeTheme(theme);
  const normalizedAccent = normalizeAccent(accentColor);
  const resolvedTheme = resolveTheme(normalizedTheme);
  const family = getThemeFamily(resolvedTheme);

  document.documentElement.classList.toggle('dark', family === 'dark');
  document.documentElement.classList.toggle('light', family === 'light');
  document.body.classList.toggle('theme-light', family === 'light');
  document.body.dataset.theme = resolvedTheme;
  document.body.dataset.accent = normalizedAccent;

  if (!appliedPreference) {
    window.matchMedia(PREFERS_LIGHT_QUERY).addEventListener('change', () => {
      if (appliedPreference?.theme === 'system') {
        applyTheme(appliedPreference.theme, appliedPreference.accentColor);
      }
    });
  }
  appliedPreference = { theme: normalizedTheme, accentColor: normalizedAccent };
}
