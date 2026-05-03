import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID
};

export function isFirebaseConfigured() {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId);
}

export const firebaseApp = isFirebaseConfigured() ? (getApps()[0] || initializeApp(firebaseConfig)) : null;
export const firestore = firebaseApp ? getFirestore(firebaseApp) : null;

export async function addFirebaseDocument(collectionName: string, data: Record<string, unknown>) {
  if (!firestore) throw new Error('Firebase is not configured');
  const docRef = await addDoc(collection(firestore, collectionName), {
    ...data,
    createdAt: serverTimestamp(),
    source: 'mobile-app'
  });
  return { id: docRef.id };
}
