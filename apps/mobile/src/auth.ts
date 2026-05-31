// Firebase auth removed — app uses server-side OTP exclusively
export { isFirebaseConfigured } from './firebase';
export const firebaseAuth = null;
export type OtpConfirmation = never;
export async function sendPhoneOtp(_phone: string, _verifier: unknown): Promise<never> { throw new Error('Firebase not configured'); }
export async function confirmPhoneOtp(_confirmation: never, _code: string): Promise<string> { throw new Error('Firebase not configured'); }
export async function getFirebaseIdToken(): Promise<string | null> { return null; }
export async function signOut(): Promise<void> {}
