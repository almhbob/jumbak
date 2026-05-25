import { Router } from 'express';
import { prisma } from '../db.js';
import { memoryDrivers, memoryUsers } from '../store.js';
import { UserRole } from '@prisma/client';

const router = Router();

router.get('/', async (req, res) => {
  const cityId = String(req.query.cityId || '');
  const vehicleTypeId = String(req.query.vehicleTypeId || '');

  if (prisma) {
    const result = await prisma.driver.findMany({
      where: {
        ...(cityId ? { cityId } : {}),
        ...(vehicleTypeId ? { vehicle: { vehicleTypeId } } : {}),
      },
      include: { user: true, vehicle: { include: { vehicleType: true } } },
    });
    return res.json(
      result.map((driver) => ({
        id: driver.id,
        name: driver.user.name || driver.user.phone,
        vehicleTypeId: driver.vehicle?.vehicleTypeId,
        vehicle: driver.vehicle?.vehicleType?.nameEn || 'Vehicle',
        rating: 4.8,
        online: driver.isOnline,
        verified: driver.isVerified,
        cityId: driver.cityId,
      }))
    );
  }

  const result = memoryDrivers.filter(
    (d) => (!cityId || d.cityId === cityId) && (!vehicleTypeId || d.vehicleTypeId === vehicleTypeId)
  );
  res.json(result);
});

router.post('/register', async (req, res) => {
  const phone = String(req.body.phone || '').trim();
  const name = String(req.body.name || '').trim();
  const cityId = String(req.body.cityId || 'rufaa');
  const vehicleTypeId = String(req.body.vehicleTypeId || 'rickshaw');
  const plateNo = String(req.body.plateNo || '').trim();
  const color = String(req.body.color || '').trim();
  const model = String(req.body.model || '').trim();

  if (!phone || !name) return res.status(400).json({ error: 'phone and name are required' });

  if (prisma) {
    const user = await prisma.user.upsert({
      where: { phone },
      update: { name, role: UserRole.DRIVER },
      create: { phone, name, role: UserRole.DRIVER },
    });
    const driver = await prisma.driver.upsert({
      where: { userId: user.id },
      update: { cityId, isOnline: false, isVerified: false },
      create: { userId: user.id, cityId, isOnline: false, isVerified: false },
    });
    const vehicle = await prisma.vehicle.upsert({
      where: { driverId: driver.id },
      update: { vehicleTypeId, plateNo, color, model },
      create: { driverId: driver.id, vehicleTypeId, plateNo, color, model },
    });
    return res.status(201).json({
      ok: true,
      user: { id: user.id, phone: user.phone, name: user.name, role: user.role },
      driver,
      vehicle,
    });
  }

  const existing = memoryDrivers.find((d) => d.phone === phone);
  if (existing) return res.status(409).json({ error: 'Driver already registered with this phone number' });

  const driver = {
    id: `driver_${Date.now()}`,
    name,
    phone,
    cityId,
    vehicleTypeId,
    vehicle: `${color || 'Vehicle'} ${model || vehicleTypeId}`,
    rating: 5,
    online: false,
    verified: false,
    plateNo,
  };
  memoryDrivers.push(driver);

  let user = memoryUsers.find((u) => u.phone === phone);
  if (!user) {
    user = { id: `user_${Date.now()}`, phone, name, role: 'DRIVER', createdAt: new Date().toISOString() };
    memoryUsers.push(user);
  }
  res.status(201).json({ ok: true, driver });
});

export default router;
