import { prisma } from '../db.js';

export type DispatchSettings = {
  dailyRejectionLimit: number;
  suspensionHoursFirst: number;
  suspensionHoursDriverRepeat: number;
  walletDeductionSDG: number;
  dailyCancellationLimit: number;
  suspensionHoursPassengerFirst: number;
  suspensionHoursPassengerRepeat: number;
  offerTimeoutSeconds: number;
};

const DEFAULTS: DispatchSettings = {
  dailyRejectionLimit: 2,
  suspensionHoursFirst: 12,
  suspensionHoursDriverRepeat: 24,
  walletDeductionSDG: 50,
  dailyCancellationLimit: 2,
  suspensionHoursPassengerFirst: 12,
  suspensionHoursPassengerRepeat: 48,
  offerTimeoutSeconds: 60,
};

const KEY_MAP: Record<keyof DispatchSettings, string> = {
  dailyRejectionLimit: 'dispatch.dailyRejectionLimit',
  suspensionHoursFirst: 'dispatch.suspensionHoursFirst',
  suspensionHoursDriverRepeat: 'dispatch.suspensionHoursDriverRepeat',
  walletDeductionSDG: 'dispatch.walletDeductionSDG',
  dailyCancellationLimit: 'dispatch.dailyCancellationLimit',
  suspensionHoursPassengerFirst: 'dispatch.suspensionHoursPassengerFirst',
  suspensionHoursPassengerRepeat: 'dispatch.suspensionHoursPassengerRepeat',
  offerTimeoutSeconds: 'dispatch.offerTimeoutSeconds',
};

// In-memory cache — refreshed after any update
let cache: DispatchSettings | null = null;
let cacheTime = 0;
const CACHE_TTL_MS = 5 * 60_000; // 5 minutes

export async function getDispatchSettings(): Promise<DispatchSettings> {
  const now = Date.now();
  if (cache && now - cacheTime < CACHE_TTL_MS) return cache;

  if (!prisma) {
    cache = { ...DEFAULTS };
    cacheTime = now;
    return cache;
  }

  try {
    const rows = await prisma.platformSetting.findMany({
      where: { key: { startsWith: 'dispatch.' } },
    });

    const map: Record<string, string> = {};
    for (const row of rows) map[row.key] = row.value;

    const settings: DispatchSettings = { ...DEFAULTS };
    for (const [field, dbKey] of Object.entries(KEY_MAP) as [keyof DispatchSettings, string][]) {
      if (map[dbKey] !== undefined) {
        const n = Number(map[dbKey]);
        if (Number.isFinite(n) && n > 0) settings[field] = n;
      }
    }

    cache = settings;
    cacheTime = now;
    return settings;
  } catch {
    return { ...DEFAULTS };
  }
}

export function invalidateSettingsCache(): void {
  cache = null;
  cacheTime = 0;
}

export async function updateDispatchSetting(
  field: keyof DispatchSettings,
  value: number,
  updatedBy?: string
): Promise<void> {
  const key = KEY_MAP[field];
  if (!key) throw new Error(`Unknown setting: ${field}`);

  if (prisma) {
    await prisma.platformSetting.upsert({
      where: { key },
      update: { value: String(value), updatedBy: updatedBy ?? null },
      create: { key, value: String(value), updatedBy: updatedBy ?? null },
    });
  }

  invalidateSettingsCache();
}

export { DEFAULTS as dispatchSettingsDefaults, KEY_MAP as dispatchSettingsKeyMap };
