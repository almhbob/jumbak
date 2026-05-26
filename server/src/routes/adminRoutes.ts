import { Router } from 'express';
import { prisma } from '../db.js';
import { memoryCities, memoryVehicleTypes } from './configStore.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { rufaaZones, ZONE_CATEGORIES } from '../data/rufaaZones.js';

// In-memory mutable zone store (seeded from rufaaZones, shared across requests)
type MemZone = { id: string; cityId: string; nameAr: string; nameEn: string; category: string };
const memoryZones: MemZone[] = rufaaZones.map((z) => ({ ...z }));

const router = Router();

// Add or update a city — developer only
router.post('/cities', requireAuth, requireRole('developer'), async (req, res) => {
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

// Add or update a vehicle type — developer only
router.post('/vehicle-types', requireAuth, requireRole('developer'), async (req, res) => {
  const id = String(req.body.id || '').trim().toLowerCase();
  const nameAr = String(req.body.nameAr || '').trim();
  const nameEn = String(req.body.nameEn || '').trim();
  const baseFare = Number(req.body.baseFare || 0);
  const perKmFare = Number(req.body.perKmFare || 0);
  const minimumFare = Number(req.body.minimumFare || 0);

  if (!id || !nameAr || !nameEn || !baseFare || !perKmFare || !minimumFare) {
    return res.status(400).json({ error: 'Missing vehicle type fields' });
  }

  const item = { id, nameAr, nameEn, baseFare, perKmFare, minimumFare };

  if (prisma) {
    const vehicleType = await prisma.vehicleType.upsert({ where: { id }, update: item, create: item });
    return res.status(201).json(vehicleType);
  }

  const index = memoryVehicleTypes.findIndex((v) => v.id === id);
  if (index >= 0) memoryVehicleTypes[index] = item;
  else memoryVehicleTypes.push(item);
  res.status(201).json(item);
});

// ─── Zone management ─────────────────────────────────────────────────────────

// GET /api/admin/zones?cityId=rufaa
router.get('/zones', async (req, res) => {
  const cityId = String(req.query.cityId || 'rufaa');
  if (prisma) {
    const zones = await prisma.zone.findMany({ where: { cityId }, orderBy: { nameAr: 'asc' } });
    return res.json({ zones, categories: ZONE_CATEGORIES });
  }
  res.json({ zones: memoryZones.filter((z) => z.cityId === cityId), categories: ZONE_CATEGORIES });
});

// POST /api/admin/zones — add a new zone
router.post('/zones', requireAuth, requireRole('developer', 'operations'), async (req, res) => {
  const cityId = String(req.body.cityId || 'rufaa').trim();
  const nameAr = String(req.body.nameAr || '').trim();
  const nameEn = String(req.body.nameEn || nameAr).trim();
  const category = String(req.body.category || 'مرافق ومعالم').trim();

  if (!nameAr) return res.status(400).json({ error: 'nameAr is required' });

  if (prisma) {
    const zone = await prisma.zone.create({ data: { cityId, nameAr, nameEn } });
    return res.status(201).json(zone);
  }

  const id = `${cityId}-custom-${Date.now()}`;
  const zone: MemZone = { id, cityId, nameAr, nameEn, category };
  memoryZones.push(zone);
  res.status(201).json(zone);
});

// PATCH /api/admin/zones/:id — edit a zone name
router.patch('/zones/:id', requireAuth, requireRole('developer', 'operations'), async (req, res) => {
  const id = String(req.params.id);
  const nameAr = String(req.body.nameAr || '').trim();
  const nameEn = String(req.body.nameEn || nameAr).trim();
  const category = String(req.body.category || '').trim();

  if (!nameAr) return res.status(400).json({ error: 'nameAr is required' });

  if (prisma) {
    const zone = await prisma.zone.update({ where: { id }, data: { nameAr, nameEn } }).catch(() => null);
    if (!zone) return res.status(404).json({ error: 'Zone not found' });
    return res.json(zone);
  }

  const zone = memoryZones.find((z) => z.id === id);
  if (!zone) return res.status(404).json({ error: 'Zone not found' });
  zone.nameAr = nameAr;
  zone.nameEn = nameEn;
  if (category) zone.category = category;
  res.json(zone);
});

// DELETE /api/admin/zones/:id — remove a zone
router.delete('/zones/:id', requireAuth, requireRole('developer'), async (req, res) => {
  const id = String(req.params.id);

  if (prisma) {
    await prisma.zone.delete({ where: { id } }).catch(() => null);
    return res.json({ ok: true });
  }

  const idx = memoryZones.findIndex((z) => z.id === id);
  if (idx >= 0) memoryZones.splice(idx, 1);
  res.json({ ok: true });
});

export default router;
