// Firebase removed — app uses server REST API exclusively
export const firebaseApp = null;
export const firestore = null;
export function isFirebaseConfigured() { return false; }
export async function addFirebaseDocument(_col: string, _data: Record<string, unknown>) { throw new Error('Firebase not configured'); }
export async function updateFirebaseDocument(_col: string, _id: string, _data: Record<string, unknown>) { throw new Error('Firebase not configured'); }
export function subscribeFirebaseCollection<T>(_col: string, _statuses: string[] | null, _onData: (items: T[]) => void, _onError?: () => void) { return () => undefined; }
