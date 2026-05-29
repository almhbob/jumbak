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
  const nationalId = String(req.body.nationalId || '').trim() || null;
  const chassisNo = String(req.body.chassisNo || '').trim() || null;
  const trafficId = String(req.body.trafficId || '').trim() || null;
  const bankAccount = String(req.body.bankAccount || '').trim() || null;
  const guarantorName = String(req.body.guarantorName || '').trim() || null;
  const guarantorPhone = String(req.body.guarantorPhone || '').trim() || null;
  const guarantorAddress = String(req.body.guarantorAddress || '').trim() || null;

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
    await prisma.driverApplication.upsert({
      where: { driverId: driver.id },
      update: { phone, name, cityId, vehicleTypeId, plateNo, color, model, nationalId, chassisNo, trafficId, bankAccount, guarantorName, guarantorPhone, guarantorAddress, status: 'pending_review', complianceStatus: 'needs_admin_review' },
      create: { driverId: driver.id, phone, name, cityId, vehicleTypeId, plateNo, color, model, nationalId, chassisNo, trafficId, bankAccount, guarantorName, guarantorPhone, guarantorAddress },
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
    nationalId,
    chassisNo,
    trafficId,
    bankAccount,
    guarantorName,
    guarantorPhone,
    guarantorAddress,
    status: 'pending_review',
    complianceStatus: 'needs_admin_review',
    freeMonth: true,
  };
  memoryDrivers.push(driver);

  let user = memoryUsers.find((u) => u.phone === phone);
  if (!user) {
    user = { id: `user_${Date.now()}`, phone, name, role: 'DRIVER', createdAt: new Date().toISOString() };
    memoryUsers.push(user);
  }
  res.status(201).json({ ok: true, driver });
});

router.get('/applications', async (_req, res) => {
  if (prisma) {
    const applications = await prisma.driverApplication.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return res.json(applications);
  }
  res.json(memoryDrivers.filter((d: any) => d.status === 'pending_review' || d.guarantorName));
});

router.patch('/applications/:id/review', async (req, res) => {
  const { status, reviewedBy } = req.body;
  if (!['approved', 'rejected'].includes(String(status))) {
    return res.status(400).json({ error: 'status must be approved or rejected' });
  }
  if (prisma) {
    const app = await prisma.driverApplication.update({
      where: { id: req.params.id },
      data: {
        status: String(status),
        complianceStatus: status === 'approved' ? 'approved' : 'rejected',
        reviewedBy: String(reviewedBy || ''),
        approvedAt: status === 'approved' ? new Date() : undefined,
        rejectedAt: status === 'rejected' ? new Date() : undefined,
      },
    }).catch(() => null);
    if (!app) return res.status(404).json({ error: 'Application not found' });
    if (status === 'approved' && app.driverId) {
      await prisma.driver.update({ where: { id: app.driverId }, data: { isVerified: true } }).catch(() => null);
    }
    return res.json(app);
  }
  const driver = memoryDrivers.find((d: any) => d.id === req.params.id);
  if (!driver) return res.status(404).json({ error: 'Application not found' });
  (driver as any).status = status;
  res.json(driver);
});

export default router;
