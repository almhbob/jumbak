'use client';

import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc, serverTimestamp } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

export function isClientFirebaseConfigured() {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId);
}

function getClientDb() {
  if (!isClientFirebaseConfigured()) throw new Error('Firebase is not configured');
  const app = getApps()[0] || initializeApp(firebaseConfig);
  return getFirestore(app);
}

export async function getClientFirebaseCollection<T>(name: string, fallback: T[]): Promise<T[]> {
  if (!isClientFirebaseConfigured()) return fallback;
  try {
    const db = getClientDb();
    const snapshot = await getDocs(collection(db, name));
    return snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as T));
  } catch {
    return fallback;
  }
}

export async function updateClientFirebaseDocument(collectionName: string, id: string, data: Record<string, unknown>) {
  const db = getClientDb();
  await updateDoc(doc(db, collectionName, id), {
    ...data,
    updatedAt: serverTimestamp()
  });
  return { id, ...data };
}
