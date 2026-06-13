import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_API_URL || '';

export async function createSupportRequest(input: {
  category: string;
  message: string;
  lang: 'ar' | 'en';
  phone?: string;
  name?: string;
}) {
  if (!API_URL) throw new Error('No backend configured');
  const token = await AsyncStorage.getItem('jnbk_auth_token').catch(() => null);
  const response = await fetch(`${API_URL}/api/support`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(input),
  });
  if (!response.ok) throw new Error('Failed to create support request');
  return response.json();
}

export async function getSupportRequests() {
  if (!API_URL) throw new Error('No backend configured');
  const token = await AsyncStorage.getItem('jnbk_auth_token').catch(() => null);
  const response = await fetch(`${API_URL}/api/support`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) throw new Error('Failed to fetch support requests');
  return response.json();
}
