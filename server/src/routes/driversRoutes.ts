import { Router } from 'express';
import { prisma } from '../db.js';
import { memoryDrivers, memoryUsers, MemDriver } from '../store.js';
import { UserRole } from '@prisma/client';
import { validateBody, registerDriverSchema, reviewApplicationSchema } from '../middleware/validate.js';
import { sendPushNotifications } from '../services/notificationService.js';
import { logger } from '../services/logger.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();
const ADMIN_ROLES = ['operations', 'supervisor', 'business', 'developer'] as const;

function isAdminRole(role?: string) {
  return ADMIN_ROLES.includes(String(role || '').toLowerCase() as typeof ADMIN_ROLES[number]);
}

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
    return res.json(result.map((driver) => ({
      id: driver.id,
      name: driver.user.name || driver.user.phone,
      vehicleTypeId: driver.vehicle?.vehicleTypeId,
      vehicle: driver.vehicle?.vehicleType?.nameEn || 'Vehicle',
      rating: 4.8,
      online: driver.isOnline,
      verified: driver.isVerified,
      cityId: driver.cityId,
    })));
  }

  res.json(memoryDrivers.filter((d) => (!cityId || d.cityId === cityId) && (!vehicleTypeId || d.vehicleTypeId === vehicleTypeId)));
});

router.post('/register', validateBody(registerDriverSchema), async (req, res) => {
  const {
    phone, name, cityId, vehicleTypeId, plateNo, color, model,
    nationalId = null, chassisNo = null, trafficId = null, bankAccount = null,
    guarantorName = null, guarantorPhone = null, guarantorAddress = null,
  } = req.body as {
    phone: string; name: string; cityId: string; vehicleTypeId: string;
    plateNo: string; color: string; model: string;
    nationalId?: string | null; chassisNo?: string | null; trafficId?: string | null;
    bankAccount?: string | null; guarantorName?: string | null;
    guarantorPhone?: string | null; guarantorAddress?: string | null;
  };

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
    const application = await prisma.driverApplication.upsert({
      where: { driverId: driver.id },
      update: {
        phone, name, cityId, vehicleTypeId, plateNo, color, model,
        nationalId, chassisNo, trafficId, bankAccount,
        guarantorName, guarantorPhone, guarantorAddress,
        status: 'pending_review', complianceStatus: 'needs_admin_review',
      },
      create: {
        driverId: driver.id,
        phone, name, cityId, vehicleTypeId, plateNo, color, model,
        nationalId, chassisNo, trafficId, bankAccount,
        guarantorName, guarantorPhone, guarantorAddress,
      },
    });
    logger.info('Driver registered', { userId: user.id, phone, cityId });
    return res.status(201).json({
      ok: true,
      user: { id: user.id, phone: user.phone, name: user.name, role: user.role },
      driver,
      vehicle,
      application: { id: driver.id, applicationId: application.id, driverId: driver.id, status: application.status },
    });
  }

  const existing = memoryDrivers.find((d) => d.phone === phone);
  if (existing) return res.status(409).json({ error: 'Driver already registered with this phone number' });

  const driver = {
    id: `driver_${Date.now()}`,
    name, phone, cityId, vehicleTypeId,
    vehicle: `${color || 'Vehicle'} ${model || vehicleTypeId}`,
    rating: 5, online: false, verified: false,
    plateNo, nationalId, chassisNo, trafficId, bankAccount,
    guarantorName, guarantorPhone, guarantorAddress,
    status: 'pending_review', complianceStatus: 'needs_admin_review',
    freeMonth: true,
  };
  memoryDrivers.push(driver);

  let user = memoryUsers.find((u) => u.phone === phone);
  if (!user) {
    user = { id: `user_${Date.now()}`, phone, name, role: 'DRIVER', createdAt: new Date().toISOString() };
    memoryUsers.push(user);
  }
  res.status(201).json({ ok: true, driver, application: { id: driver.id, driverId: driver.id, status: 'pending_review' } });
});

router.patch('/:driverId/online', requireAuth, async (req, res) => {
  const requestedId = String(req.params['driverId']);
  const isOnline = req.body.isOnline === true || req.body.isOnline === 'true';
  const role = String(req.staff?.role || '').toLowerCase();
  const userId = req.staff?.staffId;

  if (prisma) {
    let driverIdToUpdate = requestedId;

    if (isAdminRole(role)) {
      const driver = await prisma.driver.findUnique({ where: { id: requestedId } }).catch(() => null);
      if (!driver) {
        const application = await prisma.driverApplication.findUnique({ where: { id: requestedId } }).catch(() => null);
        if (!application?.driverId) return res.status(404).json({ error: 'Driver not found' });
        driverIdToUpdate = application.driverId;
      }
    } else if (role === 'driver') {
      const driver = await prisma.driver.findUnique({ where: { userId }, include: { application: true } }).catch(() => null);
      if (!driver) return res.status(403).json({ error: 'Driver profile not found' });
      const ownsRequestedId = driver.id === requestedId || driver.application?.id === requestedId;
      if (!ownsRequestedId) return res.status(403).json({ error: 'You can only update your own status' });
      if (!driver.isVerified && isOnline) return res.status(403).json({ error: 'Driver is not verified yet' });
      driverIdToUpdate = driver.id;
    } else {
      return res.status(403).json({ error: 'Not allowed' });
    }

    const driver = await prisma.driver.update({ where: { id: driverIdToUpdate }, data: { isOnline } }).catch(() => null);
    if (!driver) return res.status(404).json({ error: 'Driver not found' });
    logger.info('Driver status toggled', { driverId: driver.id, isOnline, role });
    return res.json({ ok: true, driverId: driver.id, isOnline, isVerified: driver.isVerified });
  }

  const driver = memoryDrivers.find((d) => d.id === requestedId);
  if (!driver) return res.status(404).json({ error: 'Driver not found' });
  if (!isAdminRole(role)) {
    if (role !== 'driver' || driver.phone !== req.staff?.username) return res.status(403).json({ error: 'You can only update your own status' });
    if (driver.verified === false && isOnline) return res.status(403).json({ error: 'Driver is not verified yet' });
  }
  driver.online = isOnline;
  res.json({ ok: true, driverId: driver.id, isOnline, isVerified: driver.verified !== false });
});

router.get('/applications', requireAuth, requireRole(...ADMIN_ROLES), async (_req, res) => {
  if (prisma) {
    const applications = await prisma.driverApplication.findMany({ orderBy: { createdAt: 'desc' }, take: 100, include: { driver: { include: { user: true } } } });
    return res.json(applications);
  }
  type AnyDriver = MemDriver & { status?: string; guarantorName?: string };
  res.json(memoryDrivers.filter((d) => (d as AnyDriver).status === 'pending_review' || (d as AnyDriver).guarantorName));
});

router.patch('/:driverId/verify', requireAuth, requireRole(...ADMIN_ROLES), async (req, res) => {
  const driverId = String(req.params['driverId']);
  const status = req.body.status === 'approved' ? 'approved' : 'rejected';
  const reviewedBy = String(req.body.reviewedBy || '');
  const notes = String(req.body.notes || '');

  if (prisma) {
    const driver = await prisma.driver.update({ where: { id: driverId }, data: { isVerified: status === 'approved', isOnline: false }, include: { user: { include: { deviceTokens: true } } } }).catch(() => null);
    if (!driver) return res.status(404).json({ error: 'Driver not found' });

    await prisma.driverApplication.updateMany({ where: { driverId }, data: { status, complianceStatus: status === 'approved' ? 'approved' : 'rejected', reviewedBy, approvedAt: status === 'approved' ? new Date() : undefined, rejectedAt: status === 'rejected' ? new Date() : undefined } }).catch(() => null);

    const tokens = driver.user.deviceTokens.map((t) => t.token);
    if (tokens.length) {
      sendPushNotifications(tokens, status === 'approved' ? 'Application approved' : 'Application update', notes || status, { type: 'application_review', status }).catch(() => null);
    }

    logger.info('Driver verified', { driverId, status, reviewedBy });
    return res.json({ ok: true, driverId, status, isVerified: driver.isVerified });
  }

  type ExtDriver = MemDriver & { status?: string };
  const driver = memoryDrivers.find((d) => d.id === driverId);
  if (!driver) return res.status(404).json({ error: 'Driver not found' });
  (driver as ExtDriver).status = status;
  driver.verified = status === 'approved';
  driver.online = false;
  res.json({ ok: true, driverId, status, isVerified: driver.verified });
});

router.patch('/applications/:id/review', requireAuth, requireRole(...ADMIN_ROLES), validateBody(reviewApplicationSchema), async (req, res) => {
  const { status, reviewedBy = '', notes } = req.body as { status: 'approved' | 'rejected'; reviewedBy?: string; notes?: string };

  if (prisma) {
    const appId = String(req.params['id']);
    const app = await prisma.driverApplication.update({ where: { id: appId }, data: { status, complianceStatus: status === 'approved' ? 'approved' : 'rejected', reviewedBy, approvedAt: status === 'approved' ? new Date() : undefined, rejectedAt: status === 'rejected' ? new Date() : undefined } }).catch(() => null);
    if (!app) return res.status(404).json({ error: 'Application not found' });

    if (app.driverId) await prisma.driver.update({ where: { id: app.driverId }, data: { isVerified: status === 'approved', isOnline: false } }).catch(() => null);

    if (app.driverId) {
      const driver = await prisma.driver.findUnique({ where: { id: app.driverId }, include: { user: { include: { deviceTokens: true } } } }).catch(() => null);
      const tokens = driver?.user.deviceTokens.map((t) => t.token) || [];
      if (tokens.length) sendPushNotifications(tokens, status === 'approved' ? 'Application approved' : 'Application update', notes || status, { type: 'application_review', status }).catch(() => null);
    }

    logger.info('Driver application reviewed', { applicationId: req.params.id, status, reviewedBy });
    return res.json(app);
  }

  type ExtDriver = MemDriver & { status?: string };
  const appId = String(req.params['id']);
  const driver = memoryDrivers.find((d) => (d as ExtDriver).id === appId);
  if (!driver) return res.status(404).json({ error: 'Application not found' });
  (driver as ExtDriver).status = status;
  driver.verified = status === 'approved';
  driver.online = false;
  res.json(driver);
});

export default router;
