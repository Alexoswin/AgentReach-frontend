// "Sign in with Google" through the AWS Cognito user pool, using the OAuth
// authorization code grant with PKCE. The browser leaves for Google and comes
// back to /auth/callback on this same site, which finishes the sign-in.

const COGNITO_DOMAIN = (process.env.NEXT_PUBLIC_COGNITO_DOMAIN || '')
  .trim()
  .replace(/^https?:\/\//, '')
  .replace(/\/+$/, '');
const CLIENT_ID = (process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID || '').trim();
const STORAGE_KEY = 'reachconvert:google-sign-in';
// Cognito's authorization code is valid for five minutes; allow for the
// time spent on Google's pages too.
const MAX_SIGN_IN_AGE_MS = 15 * 60 * 1000;

export type GoogleSignInPurpose = 'login' | 'link';

type PendingSignIn = {
  verifier: string;
  state: string;
  nonce: string;
  purpose: GoogleSignInPurpose;
  returnTo: string;
  startedAt: number;
};

export function isCognitoConfigured() {
  return Boolean(COGNITO_DOMAIN && CLIENT_ID);
}

function base64Url(bytes: Uint8Array) {
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function randomValue(size = 32) {
  return base64Url(crypto.getRandomValues(new Uint8Array(size)));
}

async function pkceChallenge(verifier: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return base64Url(new Uint8Array(digest));
}

function redirectUri() {
  return `${window.location.origin}/auth/callback`;
}

// Only paths on this site, so the callback cannot be used as an open redirect.
function safePath(path: string, fallback: string) {
  return path.startsWith('/') && !path.startsWith('//') ? path : fallback;
}

/** Leaves for Google. Resolves only if the browser could not navigate. */
export async function startGoogleSignIn(purpose: GoogleSignInPurpose, returnTo?: string) {
  if (!isCognitoConfigured()) {
    throw new Error('Google sign-in is not configured for this environment.');
  }
  const pending: PendingSignIn = {
    verifier: randomValue(48),
    state: randomValue(),
    nonce: randomValue(),
    purpose,
    returnTo: safePath(returnTo || (purpose === 'link' ? '/profile' : '/dashboard'), '/dashboard'),
    startedAt: Date.now(),
  };
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(pending));

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: CLIENT_ID,
    redirect_uri: redirectUri(),
    // Straight to Google, without a Cognito page in between.
    identity_provider: 'Google',
    scope: 'openid email profile',
    state: pending.state,
    nonce: pending.nonce,
    code_challenge: await pkceChallenge(pending.verifier),
    code_challenge_method: 'S256',
    // Google asks which account to use, as the Firebase popup did.
    prompt: 'select_account',
  });
  window.location.assign(`https://${COGNITO_DOMAIN}/oauth2/authorize?${params.toString()}`);
}

function callbackErrorMessage(error: string, description: string | null) {
  if (error === 'access_denied') return 'Google sign-in was cancelled.';
  return description ? `Google sign-in failed: ${description}` : 'Google sign-in failed. Please try again.';
}

/**
 * Exchanges the code Cognito sent back for the ID token, after checking it
 * answers the sign-in this tab started.
 */
export async function completeGoogleSignIn(search: URLSearchParams) {
  const raw = window.sessionStorage.getItem(STORAGE_KEY);
  window.sessionStorage.removeItem(STORAGE_KEY);
  let pending: PendingSignIn | null = null;
  try {
    pending = raw ? (JSON.parse(raw) as PendingSignIn) : null;
  } catch {
    pending = null;
  }

  const error = search.get('error');
  if (error) throw new Error(callbackErrorMessage(error, search.get('error_description')));

  const code = search.get('code');
  if (
    !pending ||
    !code ||
    pending.state !== search.get('state') ||
    Date.now() - pending.startedAt > MAX_SIGN_IN_AGE_MS
  ) {
    throw new Error('This Google sign-in expired or was started in another tab. Please try again.');
  }

  const response = await fetch(`https://${COGNITO_DOMAIN}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: CLIENT_ID,
      code,
      redirect_uri: redirectUri(),
      code_verifier: pending.verifier,
    }),
  });
  const tokens = (await response.json().catch(() => ({}))) as { id_token?: string };
  if (!response.ok || !tokens.id_token) {
    throw new Error('Google sign-in could not be completed. Please try again.');
  }

  return {
    idToken: tokens.id_token,
    nonce: pending.nonce,
    purpose: pending.purpose,
    returnTo: safePath(pending.returnTo, '/dashboard'),
  };
}
