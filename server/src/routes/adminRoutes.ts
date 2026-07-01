import { Router } from 'express';
import { prisma } from '../db.js';
import { memoryCities, memoryVehicleTypes } from './configStore.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { rufaaZones, ZONE_CATEGORIES } from '../data/rufaaZones.js';
import { getDispatchSettings, updateDispatchSetting, dispatchSettingsDefaults, type DispatchSettings } from '../services/settingsService.js';

type MemZone = { id: string; cityId: string; nameAr: string; nameEn: string; category: string; fixedFare?: number | null };
const memoryZones: MemZone[] = rufaaZones.map((z) => ({ ...z }));

const router = Router();
const PRICE_ROLES = ['developer', 'business', 'operations', 'finance', 'supervisor'] as const;
const ZONE_EDITOR_ROLES = ['developer', 'business', 'operations', 'supervisor'] as const;
const DEFAULT_ZONE_CATEGORY = ZONE_CATEGORIES[1] || ZONE_CATEGORIES[0] || 'Facilities';

function parsePositiveNumber(value: unknown, allowEmpty = false) {
  if (allowEmpty && (value === undefined || value === null || value === '')) return null;
  const n = Number(value || 0);
  return Number.isFinite(n) && n > 0 ? n : null;
}

router.post('/cities', requireAuth, requireRole('developer', 'business'), async (req, res) => {
  const id = String(req.body.id || '').trim().toLowerCase();
  const countryId = String(req.body.countryId || 'sd');
  const nameAr = String(req.body.nameAr || '').trim();
  const nameEn = String(req.body.nameEn || '').trim();
  const zonesAr: string[] = Array.isArray(req.body.zonesAr) ? req.body.zonesAr : [];
  const zonesEn: string[] = Array.isArray(req.body.zonesEn) ? req.body.zonesEn : [];

  if (!id || !nameAr || !nameEn) return res.status(400).json({ error: 'id, nameAr and nameEn are required' });

  if (prisma) {
    const city = await prisma.city.upsert({
      where: { id },
      update: { countryId, nameAr, nameEn },
      create: { id, countryId, nameAr, nameEn },
    });
    for (let i = 0; i < Math.max(zonesAr.length, zonesEn.length); i++) {
      await prisma.zone.upsert({
        where: { id: `${id}_${i}` },
        update: { nameAr: zonesAr[i] || zonesEn[i] || `Zone ${i + 1}`, nameEn: zonesEn[i] || zonesAr[i] || `Zone ${i + 1}` },
        create: { id: `${id}_${i}`, cityId: id, nameAr: zonesAr[i] || zonesEn[i] || `Zone ${i + 1}`, nameEn: zonesEn[i] || zonesAr[i] || `Zone ${i + 1}` },
      });
    }
    return res.status(201).json(city);
  }

  const city = { id, countryId, nameAr, nameEn, zonesAr, zonesEn };
  const index = memoryCities.findIndex((c) => c.id === id);
  if (index >= 0) memoryCities[index] = city;
  else memoryCities.push(city);
  res.status(201).json(city);
});

router.post('/vehicle-types', requireAuth, requireRole('developer', 'business'), async (req, res) => {
  const id = String(req.body.id || '').trim().toLowerCase();
  const nameAr = String(req.body.nameAr || '').trim();
  const nameEn = String(req.body.nameEn || '').trim();
  const baseFare = parsePositiveNumber(req.body.baseFare);
  const perKmFare = parsePositiveNumber(req.body.perKmFare);
  const minimumFare = parsePositiveNumber(req.body.minimumFare);

  if (!id || !nameAr || !nameEn || !baseFare || !perKmFare || !minimumFare) {
    return res.status(400).json({ error: 'Missing vehicle type fields' });
  }

  const item = { id, nameAr, nameEn, baseFare, perKmFare, minimumFare, isVisible: true };

  if (prisma) {
    const vehicleType = await prisma.vehicleType.upsert({ where: { id }, update: item, create: item });
    return res.status(201).json(vehicleType);
  }

  const index = memoryVehicleTypes.findIndex((v) => v.id === id);
  if (index >= 0) memoryVehicleTypes[index] = item;
  else memoryVehicleTypes.push(item);
  res.status(201).json(item);
});

router.get('/vehicle-types', requireAuth, requireRole(...PRICE_ROLES), async (_req, res) => {
  if (prisma) {
    const types = await prisma.vehicleType.findMany({ orderBy: { id: 'asc' } });
    return res.json(types);
  }
  res.json(memoryVehicleTypes);
});

router.patch('/vehicle-types/:id', requireAuth, requireRole(...PRICE_ROLES), async (req, res) => {
  const id = String(req.params.id).trim().toLowerCase();
  const baseFare = req.body.baseFare !== undefined ? parsePositiveNumber(req.body.baseFare) : undefined;
  const perKmFare = req.body.perKmFare !== undefined ? parsePositiveNumber(req.body.perKmFare) : undefined;
  const minimumFare = req.body.minimumFare !== undefined ? parsePositiveNumber(req.body.minimumFare) : undefined;

  const data: Record<string, number | string | boolean> = {};
  if (baseFare) data.baseFare = baseFare;
  if (perKmFare) data.perKmFare = perKmFare;
  if (minimumFare) data.minimumFare = minimumFare;
  if (req.body.nameAr) data.nameAr = String(req.body.nameAr).trim();
  if (req.body.nameEn) data.nameEn = String(req.body.nameEn).trim();
  if (req.body.isVisible !== undefined) data.isVisible = Boolean(req.body.isVisible);

  if (Object.keys(data).length === 0) return res.status(400).json({ error: 'No valid fields to update' });

  if (prisma) {
    const updated = await prisma.vehicleType.update({ where: { id }, data }).catch(() => null);
    if (!updated) return res.status(404).json({ error: 'Vehicle type not found' });
    return res.json(updated);
  }

  const vt = memoryVehicleTypes.find((v) => v.id === id);
  if (!vt) return res.status(404).json({ error: 'Vehicle type not found' });
  Object.assign(vt, data);
  res.json(vt);
});

router.get('/zones', requireAuth, requireRole(...ZONE_EDITOR_ROLES), async (req, res) => {
  const cityId = String(req.query.cityId || 'rufaa');
  if (prisma) {
    const zones = await prisma.zone.findMany({ where: { cityId }, orderBy: { nameAr: 'asc' } });
    return res.json({ zones, categories: ZONE_CATEGORIES });
  }
  res.json({ zones: memoryZones.filter((z) => z.cityId === cityId), categories: ZONE_CATEGORIES });
});

router.post('/zones', requireAuth, requireRole(...ZONE_EDITOR_ROLES), async (req, res) => {
  const cityId = String(req.body.cityId || 'rufaa').trim();
  const nameAr = String(req.body.nameAr || '').trim();
  const nameEn = String(req.body.nameEn || nameAr).trim();
  const category = String(req.body.category || DEFAULT_ZONE_CATEGORY).trim();
  const fixedFare = parsePositiveNumber(req.body.fixedFare, true);

  if (!nameAr) return res.status(400).json({ error: 'nameAr is required' });
  if (req.body.fixedFare !== undefined && req.body.fixedFare !== null && req.body.fixedFare !== '' && fixedFare === null) {
    return res.status(400).json({ error: 'fixedFare must be a positive number or empty' });
  }

  if (prisma) {
    const zone = await prisma.zone.create({ data: { cityId, nameAr, nameEn, category, fixedFare } });
    return res.status(201).json(zone);
  }

  const id = `${cityId}-custom-${Date.now()}`;
  const zone: MemZone = { id, cityId, nameAr, nameEn, category, fixedFare };
  memoryZones.push(zone);
  res.status(201).json(zone);
});

router.patch('/zones/:id', requireAuth, requireRole(...ZONE_EDITOR_ROLES), async (req, res) => {
  const id = String(req.params.id);
  const nameAr = String(req.body.nameAr || '').trim();
  const nameEn = String(req.body.nameEn || nameAr).trim();
  const category = String(req.body.category || '').trim();
  const fixedFare = req.body.fixedFare !== undefined ? parsePositiveNumber(req.body.fixedFare, true) : undefined;

  if (!nameAr) return res.status(400).json({ error: 'nameAr is required' });
  if (req.body.fixedFare !== undefined && req.body.fixedFare !== null && req.body.fixedFare !== '' && fixedFare === null) {
    return res.status(400).json({ error: 'fixedFare must be a positive number or empty' });
  }

  if (prisma) {
    const data: Record<string, string | number | null> = { nameAr, nameEn };
    if (category) data.category = category;
    if (fixedFare !== undefined) data.fixedFare = fixedFare;
    const zone = await prisma.zone.update({ where: { id }, data }).catch(() => null);
    if (!zone) return res.status(404).json({ error: 'Zone not found' });
    return res.json(zone);
  }

  const zone = memoryZones.find((z) => z.id === id);
  if (!zone) return res.status(404).json({ error: 'Zone not found' });
  zone.nameAr = nameAr;
  zone.nameEn = nameEn;
  if (category) zone.category = category;
  if (fixedFare !== undefined) zone.fixedFare = fixedFare;
  res.json(zone);
});

router.delete('/zones/:id', requireAuth, requireRole('developer', 'business'), async (req, res) => {
  const id = String(req.params.id);

  if (prisma) {
    await prisma.zone.delete({ where: { id } }).catch(() => null);
    return res.json({ ok: true });
  }

  const idx = memoryZones.findIndex((z) => z.id === id);
  if (idx >= 0) memoryZones.splice(idx, 1);
  res.json({ ok: true });
});

// ─── Penalty / Dispatch settings ──────────────────────────────────────────────

const PENALTY_ROLES = ['developer', 'supervisor', 'operations'] as const;

router.get('/penalty-settings', requireAuth, requireRole(...PENALTY_ROLES), async (_req, res) => {
  const settings = await getDispatchSettings();
  res.json({ settings, defaults: dispatchSettingsDefaults });
});

router.patch('/penalty-settings', requireAuth, requireRole(...PENALTY_ROLES), async (req, res) => {
  const updatedBy = String(req.staff?.username || req.staff?.staffId || 'admin');
  const allowed: (keyof DispatchSettings)[] = [
    'dailyRejectionLimit',
    'suspensionHoursFirst',
    'suspensionHoursDriverRepeat',
    'walletDeductionSDG',
    'dailyCancellationLimit',
    'suspensionHoursPassengerFirst',
    'suspensionHoursPassengerRepeat',
    'offerTimeoutSeconds',
  ];

  const errors: string[] = [];
  const updated: Partial<DispatchSettings> = {};

  for (const field of allowed) {
    if (req.body[field] === undefined) continue;
    const n = Number(req.body[field]);
    if (!Number.isFinite(n) || n <= 0) {
      errors.push(`${field}: must be a positive number`);
      continue;
    }
    await updateDispatchSetting(field, n, updatedBy).catch((e) => errors.push(String(e)));
    updated[field] = n;
  }

  if (errors.length) return res.status(400).json({ error: errors.join('; '), updated });

  const settings = await getDispatchSettings();
  res.json({ ok: true, settings });
});

// ─── Unsuspend ────────────────────────────────────────────────────────────────

const UNSUSPEND_ROLES = ['developer', 'supervisor', 'operations'] as const;

router.patch('/drivers/:id/unsuspend', requireAuth, requireRole(...UNSUSPEND_ROLES), async (req, res) => {
  const driverId = String(req.params['id']);

  if (prisma) {
    const driver = await prisma.driver
      .update({
        where: { id: driverId },
        data: { suspendedUntil: null, violationCount: 0, dailyRejections: 0, isOnline: false },
      })
      .catch(() => null);
    if (!driver) return res.status(404).json({ error: 'Driver not found' });
    return res.json({ ok: true, driverId });
  }

  res.json({ ok: true, driverId });
});

router.patch('/users/:id/unsuspend', requireAuth, requireRole(...UNSUSPEND_ROLES), async (req, res) => {
  const userId = String(req.params['id']);

  if (prisma) {
    const user = await prisma.user
      .update({
        where: { id: userId },
        data: { suspendedUntil: null, dailyCancellations: 0 },
      })
      .catch(() => null);
    if (!user) return res.status(404).json({ error: 'User not found' });
    return res.json({ ok: true, userId });
  }

  res.json({ ok: true, userId });
});

// ─── Dispatch Monitor ─────────────────────────────────────────────────────────

router.get('/dispatch-monitor', requireAuth, requireRole(...PENALTY_ROLES), async (_req, res) => {
  if (!prisma) {
    return res.json({
      suspendedDrivers: [],
      suspendedPassengers: [],
      pendingOffers: 0,
      openRides: 0,
      todayRejections: [],
    });
  }

  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);

  const [suspendedDrivers, suspendedPassengers, pendingOffers, openRides, driverRejections] =
    await Promise.all([
      prisma.driver.findMany({
        where: { suspendedUntil: { gt: now } },
        include: { user: true },
      }),
      prisma.user.findMany({
        where: { suspendedUntil: { gt: now }, role: 'PASSENGER' },
      }),
      prisma.rideOffer.count({ where: { status: 'PENDING' } }),
      prisma.ride.count({ where: { status: 'REQUESTED', driverId: null } }),
      prisma.driver.findMany({
        where: { dailyRejections: { gt: 0 }, lastRejectionDate: { gte: startOfDay } },
        include: { user: true },
      }),
    ]);

  type DrvRow = { id: string; violationCount: number; dailyRejections: number; suspendedUntil: Date | null; user: { name: string | null; phone: string } };
  type UsrRow = { id: string; name: string | null; phone: string; suspendedUntil: Date | null };

  res.json({
    suspendedDrivers: (suspendedDrivers as DrvRow[]).map((d) => ({
      id: d.id,
      name: d.user.name || d.user.phone,
      phone: d.user.phone,
      suspendedUntil: d.suspendedUntil,
      violationCount: d.violationCount,
    })),
    suspendedPassengers: (suspendedPassengers as UsrRow[]).map((u) => ({
      id: u.id,
      name: u.name || u.phone,
      phone: u.phone,
      suspendedUntil: u.suspendedUntil,
    })),
    pendingOffers,
    openRides,
    todayRejections: (driverRejections as DrvRow[]).map((d) => ({
      id: d.id,
      name: d.user.name || d.user.phone,
      phone: d.user.phone,
      dailyRejections: d.dailyRejections,
      violationCount: d.violationCount,
    })),
  });
});

export default router;
