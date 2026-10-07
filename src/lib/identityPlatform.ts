import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  browserSessionPersistence,
  getAuth,
  getRedirectResult,
  GoogleAuthProvider,
  inMemoryPersistence,
  setPersistence,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type UserCredential,
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
};

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
  const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  return getAuth(app);
}

function googleProvider() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  return provider;
}

async function idTokenFromCredential(credential: UserCredential) {
  return credential.user.getIdToken(true);
}

export async function signInWithGooglePopup() {
  const auth = getIdentityAuth();
  await setPersistence(auth, inMemoryPersistence);
  const credential = await signInWithPopup(auth, googleProvider());
  return idTokenFromCredential(credential);
}

export async function startGoogleRedirect() {
  const auth = getIdentityAuth();
  await setPersistence(auth, browserSessionPersistence);
  await signInWithRedirect(auth, googleProvider());
}

export async function completeGoogleRedirect() {
  const auth = getIdentityAuth();
  await setPersistence(auth, browserSessionPersistence);
  const credential = await getRedirectResult(auth);
  return credential ? idTokenFromCredential(credential) : null;
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
  if (code === 'auth/popup-closed-by-user') {
    return 'Google sign-in was cancelled.';
  }
  if (code === 'auth/network-request-failed') {
    return 'Google sign-in could not reach Identity Platform. Check your connection and try again.';
  }

  return error instanceof Error ? error.message : 'Could not sign in with Google.';
}
