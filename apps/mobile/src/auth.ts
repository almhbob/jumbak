import { getAuth, signInWithPhoneNumber, signOut as firebaseSignOut } from 'firebase/auth';
import type { ConfirmationResult, ApplicationVerifier } from 'firebase/auth';
import { firebaseApp, isFirebaseConfigured } from './firebase';

export { isFirebaseConfigured };

export const firebaseAuth = firebaseApp ? getAuth(firebaseApp) : null;

export type OtpConfirmation = ConfirmationResult;

/**
 * Step 1 — sends a real SMS via Firebase.
 * recaptchaVerifier must be the ref from <FirebaseRecaptchaVerifierModal>.
 */
export async function sendPhoneOtp(
  phoneNumber: string,
  recaptchaVerifier: ApplicationVerifier
): Promise<OtpConfirmation> {
  if (!firebaseAuth) throw new Error('Firebase not configured');
  return signInWithPhoneNumber(firebaseAuth, phoneNumber, recaptchaVerifier);
}

/**
 * Step 2 — confirms the code entered by the user.
 * Returns the Firebase ID token on success.
 */
export async function confirmPhoneOtp(
  confirmation: OtpConfirmation,
  code: string
): Promise<string> {
  const credential = await confirmation.confirm(code);
  const idToken = await credential.user.getIdToken();
  return idToken;
}

/** Get current user's fresh Firebase ID token (for re-auth). */
export async function getFirebaseIdToken(): Promise<string | null> {
  return firebaseAuth?.currentUser?.getIdToken() ?? null;
}

export async function signOut(): Promise<void> {
  if (firebaseAuth) await firebaseSignOut(firebaseAuth);
}
