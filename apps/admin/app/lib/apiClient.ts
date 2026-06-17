'use client';

const PRODUCTION_API_URL = 'https://jumbakserver-production.up.railway.app';
const RAW_API_URL = process.env.NEXT_PUBLIC_API_URL || '';

function normalizeApiUrl(value: string): string {
  const trimmed = value.trim().replace(/\/$/, '');
  if (!trimmed) return PRODUCTION_API_URL;
  if (trimmed.includes('localhost') || trimmed.includes('127.0.0.1') || trimmed.includes('0.0.0.0')) {
    return PRODUCTION_API_URL;
  }
  return trimmed;
}

const API_URL = normalizeApiUrl(RAW_API_URL);

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

export function getApiUrl(): string {
  return API_URL;
}

export async function checkApiHealth(): Promise<{
  configured: boolean;
  ok: boolean;
  source: 'preview' | 'backend';
  message: string;
  data?: unknown;
}> {
  try {
    const res = await fetch(`${API_URL}/health`, { cache: 'no-store' });
    const data = await res.json().catch(() => null);
    return {
      configured: true,
      ok: res.ok && Boolean((data as { ok?: boolean } | null)?.ok),
      source: 'backend',
      message: res.ok ? 'Backend is reachable' : `Backend returned ${res.status}`,
      data,
    };
  } catch (error) {
    return {
      configured: true,
      ok: false,
      source: 'backend',
      message: error instanceof Error ? error.message : 'Backend is unreachable',
    };
  }
}

export async function apiGet<T>(path: string, fallback: T): Promise<T> {
  try {
    const res = await fetch(`${API_URL}${path}`, { headers: authHeaders(), cache: 'no-store' });
    return res.ok ? res.json() : fallback;
  } catch {
    return fallback;
  }
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
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
