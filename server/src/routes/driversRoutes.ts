import { Router } from 'express';
import { prisma } from '../db.js';
import { memoryDrivers, memoryUsers, MemDriver } from '../store.js';
import { UserRole } from '@prisma/client';
import { validateBody, registerDriverSchema, reviewApplicationSchema } from '../middleware/validate.js';
import { sendPushNotifications } from '../services/notificationService.js';
import { logger } from '../services/logger.js';

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
      result.map((driver: typeof result[0]) => ({
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
    await prisma.driverApplication.upsert({
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
  res.status(201).json({ ok: true, driver });
});

router.get('/applications', async (_req, res) => {
  if (prisma) {
    const applications = await prisma.driverApplication.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { driver: { include: { user: true } } },
    });
    return res.json(applications);
  }
  type AnyDriver = MemDriver & { status?: string; guarantorName?: string };
  res.json(memoryDrivers.filter((d) => (d as AnyDriver).status === 'pending_review' || (d as AnyDriver).guarantorName));
});

router.patch('/applications/:id/review', validateBody(reviewApplicationSchema), async (req, res) => {
  const { status, reviewedBy = '', notes } = req.body as {
    status: 'approved' | 'rejected'; reviewedBy?: string; notes?: string;
  };

  if (prisma) {
    const appId = String(req.params['id']);
    const app = await prisma.driverApplication.update({
      where: { id: appId },
      data: {
        status,
        complianceStatus: status === 'approved' ? 'approved' : 'rejected',
        reviewedBy,
        approvedAt: status === 'approved' ? new Date() : undefined,
        rejectedAt: status === 'rejected' ? new Date() : undefined,
      },
    }).catch(() => null);

    if (!app) return res.status(404).json({ error: 'Application not found' });

    if (status === 'approved' && app.driverId) {
      await prisma.driver.update({ where: { id: app.driverId }, data: { isVerified: true } }).catch(() => null);
    }

    // Notify driver via push notification
    if (app.driverId) {
      const driver = await prisma.driver.findUnique({
        where: { id: app.driverId },
        include: { user: { include: { deviceTokens: true } } },
      }).catch(() => null);

      const tokens = driver?.user.deviceTokens.map((t) => t.token) || [];
      if (tokens.length) {
        const title = status === 'approved' ? 'تم قبول طلبك' : 'طلب التسجيل';
        const body =
          status === 'approved'
            ? 'مبروك! تم قبول طلبك كسائق في جنبك. يمكنك الآن بدء العمل.'
            : `لم يتم قبول طلبك حالياً. ${notes ? `السبب: ${notes}` : 'يرجى التواصل مع الدعم لمزيد من المعلومات.'}`;
        sendPushNotifications(tokens, title, body, { type: 'application_review', status }).catch(() => null);
      }
    }

    logger.info('Driver application reviewed', { applicationId: req.params.id, status, reviewedBy });
    return res.json(app);
  }

  type ExtDriver = MemDriver & { status?: string };
  const appId = String(req.params['id']);
  const driver = memoryDrivers.find((d) => (d as ExtDriver).id === appId);
  if (!driver) return res.status(404).json({ error: 'Application not found' });
  (driver as ExtDriver).status = status;
  res.json(driver);
});

export default router;
