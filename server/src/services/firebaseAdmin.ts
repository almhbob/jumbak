import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

function initAdmin() {
  if (getApps().length) return getApps()[0];

  const projectId = process.env.FIREBASE_PROJECT_ID;
  if (!projectId) return null;

  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!clientEmail || !privateKey) return null;

  return initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
}

const adminApp = initAdmin();

export function isFirebaseAdminReady(): boolean {
  return adminApp !== null;
}

export async function verifyFirebaseIdToken(idToken: string): Promise<{ phone: string; uid: string } | null> {
  if (!adminApp) return null;
  try {
    const decoded = await getAuth(adminApp).verifyIdToken(idToken);
    if (!decoded.phone_number) return null;
    return { phone: decoded.phone_number, uid: decoded.uid };
  } catch {
    return null;
  }
}
