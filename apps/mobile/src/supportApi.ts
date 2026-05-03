import { addFirebaseDocument, isFirebaseConfigured } from './firebase';

const API_URL = process.env.EXPO_PUBLIC_API_URL || '';

export async function createSupportRequest(input: {
  category: string;
  message: string;
  lang: 'ar' | 'en';
  phone?: string;
  name?: string;
}) {
  if (isFirebaseConfigured()) {
    return addFirebaseDocument('supportRequests', input);
  }

  if (!API_URL) throw new Error('No backend or Firebase configured');

  const response = await fetch(`${API_URL}/api/support`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  });
  if (!response.ok) throw new Error('Failed to create support request');
  return response.json();
}
