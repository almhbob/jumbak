import { Router } from 'express';
import { prisma } from '../db.js';
import { memoryCities, memoryVehicleTypes } from './configStore.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

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

export default router;
