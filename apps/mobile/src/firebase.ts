import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, addDoc, serverTimestamp, onSnapshot, query, where, doc, updateDoc } from 'firebase/firestore';

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

export async function updateFirebaseDocument(collectionName: string, id: string, data: Record<string, unknown>) {
  if (!firestore) throw new Error('Firebase is not configured');
  await updateDoc(doc(firestore, collectionName, id), {
    ...data,
    updatedAt: serverTimestamp()
  });
  return { id, ...data };
}

export function subscribeFirebaseCollection<T>(collectionName: string, statuses: string[] | null, onData: (items: T[]) => void, onError?: () => void) {
  if (!firestore) return () => undefined;
  const base = collection(firestore, collectionName);
  const q = statuses && statuses.length ? query(base, where('status', 'in', statuses.slice(0, 10))) : query(base);
  return onSnapshot(
    q,
    (snapshot) => onData(snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as T))),
    () => onError?.()
  );
}
