import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

export function isFirebaseConfigured() {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId);
}

export const firebaseApp = isFirebaseConfigured() ? (getApps()[0] || initializeApp(firebaseConfig)) : null;
export const firestore = firebaseApp ? getFirestore(firebaseApp) : null;

export async function getFirebaseCollection<T>(name: string, fallback: T[]): Promise<T[]> {
  if (!firestore) return fallback;
  try {
    const snapshot = await getDocs(collection(firestore, name));
    return snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as T));
  } catch {
    return fallback;
  }
}
