import { Router } from 'express';
import { prisma } from '../db.js';
import { memoryDrivers } from '../store.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.get('/', requireAuth, async (req, res) => {
  const role = String(req.staff?.role || '').toLowerCase();
  const userId = req.staff?.staffId;

  if (role !== 'driver' || !userId) {
    return res.status(403).json({ error: 'Driver access required' });
  }

  if (prisma) {
    const driver = await prisma.driver.findUnique({
      where: { userId },
      include: {
        user: true,
        vehicle: { include: { vehicleType: true } },
        application: true,
      },
    }).catch(() => null);

    if (!driver) return res.status(404).json({ error: 'Driver profile not found' });

    return res.json({
      id: driver.id,
      userId: driver.userId,
      name: driver.user.name || driver.user.phone,
      phone: driver.user.phone,
      cityId: driver.cityId,
      vehicleTypeId: driver.vehicle?.vehicleTypeId || driver.application?.vehicleTypeId || null,
      vehicle: driver.vehicle?.vehicleType?.nameEn || driver.application?.model || 'Vehicle',
      online: driver.isOnline,
      verified: driver.isVerified,
      applicationId: driver.application?.id || null,
      applicationStatus: driver.application?.status || null,
      complianceStatus: driver.application?.complianceStatus || null,
    });
  }

  const driver = memoryDrivers.find((d) => d.phone === req.staff?.username);
  if (!driver) return res.status(404).json({ error: 'Driver profile not found' });

  return res.json({
    id: driver.id,
    name: driver.name,
    phone: driver.phone,
    cityId: driver.cityId,
    vehicleTypeId: driver.vehicleTypeId,
    vehicle: driver.vehicle,
    online: driver.online,
    verified: driver.verified,
    applicationId: driver.id,
    applicationStatus: driver.status || null,
    complianceStatus: driver.complianceStatus || null,
  });
});

export default router;
