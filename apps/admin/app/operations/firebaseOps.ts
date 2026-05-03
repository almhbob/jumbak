'use client';

import { getClientFirebaseCollection, isClientFirebaseConfigured } from '../lib/firebaseClient';

export type OpsDriver = { id: string; name?: string; phone?: string; online?: boolean; verified?: boolean; cityId?: string; status?: string };
export type OpsRide = { id: string; status?: string; estimatedFare?: number; pickupLabel?: string; destinationLabel?: string };
export type OpsSupport = { id: string; category?: string; message?: string; lang?: string; status?: string };

const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';

async function apiGet<T>(path: string, fallback: T): Promise<T> {
  if (!apiUrl) return fallback;
  try {
    const response = await fetch(`${apiUrl}${path}`);
    return response.ok ? response.json() : fallback;
  } catch {
    return fallback;
  }
}

export function getOpsSource(lang: 'ar' | 'en') {
  if (isClientFirebaseConfigured()) return lang === 'ar' ? 'Firebase Firestore' : 'Firebase Firestore';
  if (apiUrl) return lang === 'ar' ? 'Backend API' : 'Backend API';
  return lang === 'ar' ? 'Preview' : 'Preview';
}

export async function loadOpsDrivers(fallback: OpsDriver[]) {
  return isClientFirebaseConfigured()
    ? getClientFirebaseCollection<OpsDriver>('driverApplications', fallback)
    : apiGet<OpsDriver[]>('/api/drivers', fallback);
}

export async function loadOpsRides(fallback: OpsRide[]) {
  return isClientFirebaseConfigured()
    ? getClientFirebaseCollection<OpsRide>('rides', fallback)
    : apiGet<OpsRide[]>('/api/rides', fallback);
}

export async function loadOpsSupport(fallback: OpsSupport[]) {
  return isClientFirebaseConfigured()
    ? getClientFirebaseCollection<OpsSupport>('supportRequests', fallback)
    : apiGet<OpsSupport[]>('/api/support', fallback);
}
