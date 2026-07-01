import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_API_URL || '';

// Public paths that don't need an Authorization header
const PUBLIC_PATHS = ['/api/auth/', '/api/config', '/api/pricing/'];

// In-memory token cache to avoid repeated AsyncStorage reads
let _cachedToken: string | null | undefined = undefined;

export function setTokenCache(token: string | null) {
  _cachedToken = token;
}

async function getToken(): Promise<string | null> {
  if (_cachedToken !== undefined) return _cachedToken;
  try {
    _cachedToken = await AsyncStorage.getItem('jnbk_auth_token');
    return _cachedToken ?? null;
  } catch {
    return null;
  }
}

// Called on 401 — consumer (layout) wires this up to navigate to login
let _onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(fn: () => void) {
  _onUnauthorized = fn;
}

async function tryRefreshToken(): Promise<string | null> {
  try {
    const refresh = await AsyncStorage.getItem('jnbk_refresh_token');
    if (!refresh || !API_URL) return null;
    const res = await fetch(`${API_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: refresh }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.token) {
      await AsyncStorage.setItem('jnbk_auth_token', data.token);
      _cachedToken = data.token;
      return data.token;
    }
    return null;
  } catch {
    return null;
  }
}

async function apiFetch(path: string, options?: RequestInit): Promise<any> {
  if (!API_URL) throw new Error('No backend configured');

  const isPublic = PUBLIC_PATHS.some((p) => path.startsWith(p));
  const baseHeaders: Record<string, string> = {
    ...(options?.headers as Record<string, string>),
  };

  if (!isPublic) {
    const token = await getToken();
    if (token) baseHeaders['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${path}`, { ...options, headers: baseHeaders });

  // Auto-refresh on 401
  if (response.status === 401 && !isPublic) {
    const newToken = await tryRefreshToken();
    if (newToken) {
      baseHeaders['Authorization'] = `Bearer ${newToken}`;
      const retry = await fetch(`${API_URL}${path}`, { ...options, headers: baseHeaders });
      if (!retry.ok) throw new Error(`Request failed: ${path}`);
      return retry.json();
    }
    // Refresh also failed — clear session and signal the app
    await AsyncStorage.multiRemove(['jnbk_auth_token', 'jnbk_refresh_token', 'jnbk_user_id']);
    _cachedToken = null;
    _onUnauthorized?.();
    throw new Error('Session expired');
  }

  if (!response.ok) {
    let errMsg = `Request failed: ${path}`;
    try {
      const body = await response.json();
      if (body?.error) errMsg = body.error;
    } catch {}
    throw new Error(errMsg);
  }
  return response.json();
}

// ─── Auth (public) ────────────────────────────────────────────────────────────

type DriverApplicationInput = {
  phone: string; name: string; cityId: string; vehicleTypeId: string;
  plateNo?: string; color?: string; model?: string; nationalId?: string;
  chassisNo?: string; trafficId?: string; bankAccount?: string;
  guarantorName?: string; guarantorPhone?: string; guarantorAddress?: string;
  idDocumentUrl?: string; licenseDocumentUrl?: string;
  vehicleFrontUrl?: string; vehicleBackUrl?: string; guarantorDocumentUrl?: string;
};

export async function requestOtp(phone: string) {
  return apiFetch('/api/auth/request-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone }),
  });
}

export async function verifyOtp(input: { phone: string; code: string; name?: string; role?: 'PASSENGER' | 'DRIVER' | 'ADMIN' }) {
  return apiFetch('/api/auth/verify-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}

export async function refreshAuthToken(token: string) {
  return apiFetch('/api/auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: token }),
  });
}

// ─── Config / Pricing (public) ────────────────────────────────────────────────

export async function getAppConfig() {
  return apiFetch('/api/config');
}

export async function estimatePrice(input: { cityId: string; vehicleTypeId: string; distanceKm: number }) {
  return apiFetch('/api/pricing/estimate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}

// ─── Rides (authenticated) ────────────────────────────────────────────────────

export async function createRide(input: {
  cityId: string; vehicleTypeId: string; pickupLabel: string;
  destinationLabel: string; distanceKm: number; stops?: string[];
}) {
  return apiFetch('/api/rides', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
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
    body: JSON.stringify({ status }),
  });
}

export async function rejectRide(rideId: string) {
  return apiFetch(`/api/rides/${rideId}/reject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function submitRideRating(rideId: string, rating: number) {
  return apiFetch(`/api/rides/${rideId}/rating`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rating }),
  });
}

// ─── Drivers (authenticated) ──────────────────────────────────────────────────

export async function registerDriver(input: DriverApplicationInput) {
  const documents = {
    idDocumentUrl: input.idDocumentUrl || '',
    licenseDocumentUrl: input.licenseDocumentUrl || '',
    vehicleFrontUrl: input.vehicleFrontUrl || '',
    vehicleBackUrl: input.vehicleBackUrl || '',
    guarantorDocumentUrl: input.guarantorDocumentUrl || '',
  };
  const completedDocuments = Object.values(documents).filter(Boolean).length;
  return apiFetch('/api/drivers/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...input, documents, completedDocuments,
      documentsStatus: completedDocuments >= 3 ? 'ready_for_review' : 'missing_documents',
      status: 'pending_review', freeMonth: true, complianceStatus: 'needs_admin_review',
    }),
  });
}

export async function getDrivers(cityId?: string, vehicleTypeId?: string) {
  const params = new URLSearchParams();
  if (cityId) params.set('cityId', cityId);
  if (vehicleTypeId) params.set('vehicleTypeId', vehicleTypeId);
  const query = params.toString();
  return apiFetch(`/api/drivers${query ? `?${query}` : ''}`);
}

export async function toggleDriverOnline(driverId: string, isOnline: boolean) {
  return apiFetch(`/api/drivers/${encodeURIComponent(driverId)}/online`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ isOnline }),
  });
}

// ─── Wallet (authenticated) ───────────────────────────────────────────────────

export async function getWallet(userId: string) {
  return apiFetch(`/api/wallet/${encodeURIComponent(userId)}`);
}

export async function walletPay(userId: string, amount: number, rideId: string, description?: string) {
  return apiFetch(`/api/wallet/${encodeURIComponent(userId)}/pay`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount, rideId, description }),
  });
}

export async function walletTopup(userId: string, amount: number, description?: string) {
  return apiFetch(`/api/wallet/${encodeURIComponent(userId)}/topup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount, description }),
  });
}

export async function walletEarn(userId: string, amount: number, rideId: string, description?: string) {
  return apiFetch(`/api/wallet/${encodeURIComponent(userId)}/earn`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount, rideId, description }),
  });
}

export async function walletWithdraw(userId: string, amount: number, bankAccount: string, description?: string) {
  return apiFetch(`/api/wallet/${encodeURIComponent(userId)}/withdraw`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount, bankAccount, description }),
  });
}

// ─── Notifications (authenticated) ───────────────────────────────────────────

export async function registerPushToken(token: string, userId: string) {
  return apiFetch('/api/notifications/register-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, userId }),
  });
}

export async function unregisterPushToken(token: string) {
  return apiFetch('/api/notifications/register-token', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  });
}

// ─── Account ──────────────────────────────────────────────────────────────────

export async function deleteAccount() {
  return apiFetch('/api/auth/account', { method: 'DELETE' });
}
