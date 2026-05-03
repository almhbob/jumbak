import { addFirebaseDocument, isFirebaseConfigured } from './firebase';

const API_URL = process.env.EXPO_PUBLIC_API_URL || '';

async function apiFetch(path: string, options?: RequestInit) {
  if (!API_URL) throw new Error('No backend configured');
  const response = await fetch(`${API_URL}${path}`, options);
  if (!response.ok) throw new Error(`Request failed: ${path}`);
  return response.json();
}

export async function requestOtp(phone: string) {
  if (isFirebaseConfigured()) return { ok: true, phone, devOtp: '123456', provider: 'firebase-preview' };
  return apiFetch('/api/auth/request-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone })
  });
}

export async function verifyOtp(input: { phone: string; code: string; name?: string; role?: 'PASSENGER' | 'DRIVER' | 'ADMIN' }) {
  if (isFirebaseConfigured()) {
    const user = await addFirebaseDocument('users', input);
    return { ok: true, user: { id: user.id, phone: input.phone, name: input.name, role: input.role || 'PASSENGER' }, token: `firebase_${user.id}` };
  }
  return apiFetch('/api/auth/verify-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  });
}

export async function registerDriver(input: {
  phone: string;
  name: string;
  cityId: string;
  vehicleTypeId: string;
  plateNo?: string;
  color?: string;
  model?: string;
}) {
  if (isFirebaseConfigured()) {
    const driver = await addFirebaseDocument('driverApplications', { ...input, status: 'pending_review' });
    return { ok: true, driver };
  }
  return apiFetch('/api/drivers/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  });
}

export async function getAppConfig() {
  return apiFetch('/api/config');
}

export async function estimatePrice(input: { cityId: string; vehicleTypeId: string; distanceKm: number }) {
  return apiFetch('/api/pricing/estimate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  });
}

export async function createRide(input: {
  cityId: string;
  vehicleTypeId: string;
  pickupLabel: string;
  destinationLabel: string;
  distanceKm: number;
}) {
  if (isFirebaseConfigured()) {
    const ride = await addFirebaseDocument('rides', { ...input, status: 'REQUESTED' });
    return { id: ride.id, ...input, status: 'REQUESTED', estimatedFare: 0 };
  }
  return apiFetch('/api/rides', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  });
}

export async function getRides() {
  return apiFetch('/api/rides');
}

export async function getRide(rideId: string) {
  return apiFetch(`/api/rides/${rideId}`);
}

export async function updateRideStatus(rideId: string, status: string) {
  return apiFetch(`/api/rides/${rideId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status })
  });
}

export async function submitRideRating(rideId: string, rating: number) {
  return apiFetch(`/api/rides/${rideId}/rating`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rating })
  });
}

export async function getDrivers(cityId?: string, vehicleTypeId?: string) {
  const params = new URLSearchParams();
  if (cityId) params.set('cityId', cityId);
  if (vehicleTypeId) params.set('vehicleTypeId', vehicleTypeId);
  const query = params.toString();
  return apiFetch(`/api/drivers${query ? `?${query}` : ''}`);
}
