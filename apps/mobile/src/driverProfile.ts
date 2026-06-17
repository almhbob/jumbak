import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_API_URL || '';

export type CurrentDriverProfile = {
  id: string;
  userId?: string;
  name?: string;
  phone?: string;
  cityId?: string;
  vehicleTypeId?: string | null;
  vehicle?: string | null;
  online?: boolean;
  verified?: boolean;
  applicationId?: string | null;
  applicationStatus?: string | null;
  complianceStatus?: string | null;
};

export async function getCurrentDriverProfile(): Promise<CurrentDriverProfile | null> {
  if (!API_URL) return null;
  const token = await AsyncStorage.getItem('jnbk_auth_token');
  if (!token) return null;

  const res = await fetch(`${API_URL}/api/drivers/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (res.status === 404 || res.status === 403) return null;
  if (!res.ok) throw new Error('Could not load driver profile');

  const profile = await res.json();
  if (profile?.id) await AsyncStorage.setItem('jnbk_driver_id', String(profile.id));
  if (profile?.verified !== undefined) {
    await AsyncStorage.setItem('jnbk_driver_verified', profile.verified === true ? 'true' : 'false');
  }
  return profile;
}
