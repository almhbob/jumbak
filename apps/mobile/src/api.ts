const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000';

export async function requestOtp(phone: string) {
  const response = await fetch(`${API_URL}/api/auth/request-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone })
  });
  if (!response.ok) throw new Error('Failed to request OTP');
  return response.json();
}

export async function verifyOtp(input: { phone: string; code: string; name?: string; role?: 'PASSENGER' | 'DRIVER' | 'ADMIN' }) {
  const response = await fetch(`${API_URL}/api/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  });
  if (!response.ok) throw new Error('Failed to verify OTP');
  return response.json();
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
  const response = await fetch(`${API_URL}/api/drivers/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  });
  if (!response.ok) throw new Error('Failed to register driver');
  return response.json();
}

export async function getAppConfig() {
  const response = await fetch(`${API_URL}/api/config`);
  if (!response.ok) throw new Error('Failed to load app config');
  return response.json();
}

export async function estimatePrice(input: { cityId: string; vehicleTypeId: string; distanceKm: number }) {
  const response = await fetch(`${API_URL}/api/pricing/estimate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  });
  if (!response.ok) throw new Error('Failed to estimate price');
  return response.json();
}

export async function createRide(input: {
  cityId: string;
  vehicleTypeId: string;
  pickupLabel: string;
  destinationLabel: string;
  distanceKm: number;
}) {
  const response = await fetch(`${API_URL}/api/rides`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  });
  if (!response.ok) throw new Error('Failed to create ride');
  return response.json();
}

export async function getRides() {
  const response = await fetch(`${API_URL}/api/rides`);
  if (!response.ok) throw new Error('Failed to load rides');
  return response.json();
}

export async function updateRideStatus(rideId: string, status: string) {
  const response = await fetch(`${API_URL}/api/rides/${rideId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status })
  });
  if (!response.ok) throw new Error('Failed to update ride status');
  return response.json();
}

export async function submitRideRating(rideId: string, rating: number) {
  const response = await fetch(`${API_URL}/api/rides/${rideId}/rating`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rating })
  });
  if (!response.ok) throw new Error('Failed to submit rating');
  return response.json();
}

export async function getDrivers(cityId?: string, vehicleTypeId?: string) {
  const params = new URLSearchParams();
  if (cityId) params.set('cityId', cityId);
  if (vehicleTypeId) params.set('vehicleTypeId', vehicleTypeId);
  const query = params.toString();
  const response = await fetch(`${API_URL}/api/drivers${query ? `?${query}` : ''}`);
  if (!response.ok) throw new Error('Failed to load drivers');
  return response.json();
}
