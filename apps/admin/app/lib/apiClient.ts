'use client';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem('jnbk_staff_token');
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
}

export function isApiConfigured(): boolean {
  return Boolean(API_URL);
}

export async function apiGet<T>(path: string, fallback: T): Promise<T> {
  if (!API_URL) return fallback;
  try {
    const res = await fetch(`${API_URL}${path}`, { headers: authHeaders(), cache: 'no-store' });
    return res.ok ? res.json() : fallback;
  } catch {
    return fallback;
  }
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  if (!API_URL) throw new Error('API not configured');
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

export async function apiPatch<T>(path: string, body: unknown): Promise<T> {
  if (!API_URL) throw new Error('API not configured');
  const res = await fetch(`${API_URL}${path}`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

export async function apiDelete(path: string): Promise<void> {
  if (!API_URL) throw new Error('API not configured');
  const res = await fetch(`${API_URL}${path}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || 'Request failed');
  }
}

export async function staffLogin(username: string, password: string, role: string): Promise<{ staff: Record<string, unknown>; token: string }> {
  if (!API_URL) throw new Error('API not configured');
  const res = await fetch(`${API_URL}/api/staff/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password, role }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Invalid credentials' }));
    throw new Error(err.error || 'Invalid credentials');
  }
  return res.json();
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  if (!API_URL) throw new Error('API not configured');
  const res = await fetch(`${API_URL}/api/staff/change-password`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to change password' }));
    throw new Error(err.error || 'Failed to change password');
  }
}
