import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  browserPopupRedirectResolver,
  getAuth,
  GoogleAuthProvider,
  inMemoryPersistence,
  initializeAuth,
  signInWithPopup,
  signOut,
  type Auth,
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
};

let identityAuth: Auth | null = null;

export function isIdentityPlatformConfigured() {
  return Boolean(
    firebaseConfig.apiKey &&
      firebaseConfig.authDomain &&
      firebaseConfig.projectId &&
      firebaseConfig.appId,
  );
}

function getIdentityAuth() {
  if (!isIdentityPlatformConfigured()) {
    throw new Error('Google sign-in is not configured for this environment.');
  }
  if (identityAuth) return identityAuth;

  const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  try {
    // Persistence is fixed at init so signInWithPopup can run straight from
    // the click handler. Awaiting setPersistence first used up the click's
    // user activation, and Safari/iOS then blocked the popup.
    identityAuth = initializeAuth(app, {
      persistence: inMemoryPersistence,
      popupRedirectResolver: browserPopupRedirectResolver,
    });
  } catch {
    // Already initialized, e.g. after a hot reload.
    identityAuth = getAuth(app);
  }
  return identityAuth;
}

function googleProvider() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  return provider;
}

// Initialize ahead of the click so the popup opens without waiting on the
// Identity Platform iframe (the SDK preloads it on mobile and Safari).
export function prepareGoogleSignIn() {
  if (isIdentityPlatformConfigured()) getIdentityAuth();
}

// Popup on every device. The redirect flow returns through
// <project>.firebaseapp.com, a different site from this app, and current
// Safari, Chrome and Firefox partition that site's storage, so
// getRedirectResult came back empty and mobile sign-in silently did nothing.
export async function signInWithGooglePopup() {
  const credential = await signInWithPopup(getIdentityAuth(), googleProvider());
  return credential.user.getIdToken(true);
}

export async function clearIdentityPlatformSession() {
  if (!isIdentityPlatformConfigured()) return;
  await signOut(getIdentityAuth());
}

export function identityPlatformErrorMessage(error: unknown) {
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code?: unknown }).code || '')
      : '';

  if (code === 'auth/operation-not-allowed') {
    return 'Google sign-in is not enabled in Identity Platform for this project.';
  }
  if (code === 'auth/unauthorized-domain') {
    return 'This site is not authorized for Google sign-in. Add its domain in Identity Platform.';
  }
  if (code === 'auth/popup-blocked') {
    return 'Your browser blocked the Google sign-in popup. Allow popups and try again.';
  }
  if (
    code === 'auth/popup-closed-by-user' ||
    code === 'auth/cancelled-popup-request'
  ) {
    return 'Google sign-in was cancelled.';
  }
  if (code === 'auth/operation-not-supported-in-this-environment') {
    return 'Google sign-in is not supported in this browser. Open the site in Safari or Chrome.';
  }
  if (code === 'auth/network-request-failed') {
    return 'Google sign-in could not reach Identity Platform. Check your connection and try again.';
  }

  return error instanceof Error ? error.message : 'Could not sign in with Google.';
}
