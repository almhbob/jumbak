const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000';

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

export async function getDrivers(cityId?: string, vehicleTypeId?: string) {
  const params = new URLSearchParams();
  if (cityId) params.set('cityId', cityId);
  if (vehicleTypeId) params.set('vehicleTypeId', vehicleTypeId);
  const query = params.toString();
  const response = await fetch(`${API_URL}/api/drivers${query ? `?${query}` : ''}`);
  if (!response.ok) throw new Error('Failed to load drivers');
  return response.json();
}
