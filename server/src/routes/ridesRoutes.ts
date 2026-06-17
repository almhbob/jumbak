import { Router } from 'express';
import { prisma } from '../db.js';
import { memoryRides, memoryDrivers, memoryTokens } from '../store.js';
import { memoryCities } from './configStore.js';
import { findCity, findVehicleType, estimateFare } from '../config.js';
import { Prisma, RideStatus } from '@prisma/client';
import { sendPushNotifications, rideStatusMessage } from '../services/notificationService.js';
import { emitRideUpdate } from '../services/socketService.js';
import { validateBody, createRideSchema, updateRideStatusSchema, rateRideSchema } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import { logger } from '../services/logger.js';

const router = Router();

const STAFF_ROLES = ['operations', 'supervisor', 'support', 'accountant', 'finance', 'developer', 'business'] as const;
const ACTIVE_RIDE_STATUSES = [RideStatus.REQUESTED, RideStatus.ACCEPTED, RideStatus.ARRIVING, RideStatus.ACTIVE];

function isStaffRole(role?: string) {
  return STAFF_ROLES.includes(String(role || '').toLowerCase() as typeof STAFF_ROLES[number]);
}

function toRideStatus(value: string): RideStatus {
  const upper = value.toUpperCase();
  if (['REQUESTED', 'ACCEPTED', 'ARRIVING', 'ACTIVE', 'COMPLETED', 'CANCELLED'].includes(upper)) {
    return upper as RideStatus;
  }
  return RideStatus.REQUESTED;
}

function getMemoryDriverForRequest(role: string, username: string) {
  if (role !== 'driver') return null;
  return memoryDrivers.find((d) => d.phone === username || d.id === username) || null;
}

router.get('/', requireAuth, async (req, res) => {
  const role = String(req.staff?.role || '').toLowerCase();
  const userId = req.staff?.staffId;

  if (prisma) {
    let where: Prisma.RideWhereInput = {};

    if (isStaffRole(role)) {
      where = {};
    } else if (role === 'driver') {
      const driver = await prisma.driver.findUnique({
        where: { userId },
        include: { vehicle: true },
      }).catch(() => null);

      if (!driver) return res.json([]);

      where = {
        cityId: driver.cityId,
        vehicleTypeId: driver.vehicle?.vehicleTypeId,
        status: { in: ACTIVE_RIDE_STATUSES },
        OR: [{ driverId: driver.id }, { driverId: null }],
      };
    } else {
      where = { passengerId: userId };
    }

    const rides = await prisma.ride.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { city: true, vehicleType: true, passenger: true, driver: { include: { user: true } } },
    });
    return res.json(rides);
  }

  if (isStaffRole(role)) {
    return res.json(memoryRides.slice().reverse());
  }

  if (role === 'driver') {
    const driver = getMemoryDriverForRequest(role, req.staff?.username || '');
    if (!driver) return res.json([]);
    return res.json(
      memoryRides
        .filter((ride) => {
          const isActive = ['REQUESTED', 'ACCEPTED', 'ARRIVING', 'ACTIVE'].includes(String(ride.status || ''));
          const isCompatible = ride.cityId === driver.cityId && ride.vehicleTypeId === driver.vehicleTypeId;
          return isActive && isCompatible && (!ride.driverId || ride.driverId === driver.id);
        })
        .reverse()
    );
  }

  res.json(memoryRides.filter((r) => r.passengerId === userId).reverse());
});

router.get('/:id', requireAuth, async (req, res) => {
  const rideId = String(req.params['id']);
  const role = String(req.staff?.role || '').toLowerCase();
  const userId = req.staff?.staffId;

  if (prisma) {
    const ride = await prisma.ride.findUnique({
      where: { id: rideId },
      include: { city: true, vehicleType: true, passenger: true, driver: { include: { user: true } } },
    });
    if (!ride) return res.status(404).json({ error: 'Ride not found' });

    if (!isStaffRole(role)) {
      if (role === 'driver') {
        const driver = await prisma.driver.findUnique({ where: { userId } }).catch(() => null);
        if (!driver || (ride.driverId && ride.driverId !== driver.id)) {
          return res.status(403).json({ error: 'You do not have access to this ride' });
        }
      } else if (ride.passengerId !== userId) {
        return res.status(403).json({ error: 'You do not have access to this ride' });
      }
    }

    return res.json(ride);
  }

  const ride = memoryRides.find((r) => r.id === rideId);
  if (!ride) return res.status(404).json({ error: 'Ride not found' });
  if (!isStaffRole(role) && role !== 'driver' && ride.passengerId !== userId) {
    return res.status(403).json({ error: 'You do not have access to this ride' });
  }
  res.json(ride);
});

router.post('/', requireAuth, validateBody(createRideSchema), async (req, res) => {
  const { cityId, vehicleTypeId, pickupLabel, destinationLabel, distanceKm = 2, stops } = req.body as {
    cityId: string; vehicleTypeId: string; pickupLabel: string; destinationLabel: string;
    distanceKm?: number; stops?: string[];
  };
  const role = String(req.staff?.role || '').toLowerCase();
  const passengerId = isStaffRole(role) ? null : req.staff?.staffId || null;
  const stopsJson = stops && stops.length > 2 ? JSON.stringify(stops) : null;

  if (prisma) {
    const vehicle = await prisma.vehicleType.findUnique({ where: { id: vehicleTypeId } });
    const selectedVehicle = vehicle || findVehicleType(vehicleTypeId);

    // Find drivers already assigned to active rides to exclude them first
    const busyDriverIds = (await prisma.ride.findMany({
      where: { cityId, status: { in: ACTIVE_RIDE_STATUSES }, driverId: { not: null } },
      select: { driverId: true },
    })).map((r) => r.driverId as string);

    const baseWhere: Prisma.DriverWhereInput = { cityId, isOnline: true, isVerified: true, vehicle: { vehicleTypeId } };

    // Prefer a free driver (not on active ride), least recently updated first (round-robin)
    const matchedDriver =
      (busyDriverIds.length > 0
        ? await prisma.driver.findFirst({ where: { ...baseWhere, id: { notIn: busyDriverIds } }, orderBy: { updatedAt: 'asc' } })
        : null) ??
      await prisma.driver.findFirst({ where: baseWhere, orderBy: { updatedAt: 'asc' } });

    const ride = await prisma.ride.create({
      data: {
        passengerId,
        cityId,
        vehicleTypeId,
        driverId: matchedDriver?.id,
        pickupLabel,
        destinationLabel,
        stops: stopsJson,
        distanceKm,
        estimatedFare: Math.max(
          Math.round(selectedVehicle.baseFare + distanceKm * selectedVehicle.perKmFare),
          selectedVehicle.minimumFare
        ),
        status: RideStatus.REQUESTED,
      },
    });

    if (matchedDriver) {
      await prisma.driver.update({ where: { id: matchedDriver.id }, data: { isOnline: matchedDriver.isOnline } }).catch(() => null);
    }

    // Broadcast new ride via WebSocket
    emitRideUpdate(ride.id, { rideId: ride.id, status: 'REQUESTED', type: 'new_ride', driverId: ride.driverId });

    // Notify matched driver first; otherwise notify compatible online drivers
    const onlineDrivers = matchedDriver
      ? await prisma.driver.findMany({ where: { id: matchedDriver.id }, include: { user: { include: { deviceTokens: true } } } })
      : await prisma.driver.findMany({
          where: { cityId, isOnline: true, isVerified: true, vehicle: { vehicleTypeId } },
          include: { user: { include: { deviceTokens: true } } },
        });
    const driverTokens = onlineDrivers.flatMap((d) => d.user.deviceTokens.map((t) => t.token));
    if (driverTokens.length) {
      sendPushNotifications(driverTokens, 'طلب رحلة جديد', `من ${ride.pickupLabel} إلى ${ride.destinationLabel}`, {
        rideId: ride.id,
        type: 'new_ride',
      }).catch(() => null);
    }

    logger.info('Ride created', { rideId: ride.id, cityId, vehicleTypeId, passengerId, driverId: ride.driverId });
    return res.status(201).json(ride);
  }

  const city = findCity(cityId);
  const vehicle = findVehicleType(vehicleTypeId);
  const matchedDriver = memoryDrivers.find((d) => d.cityId === cityId && d.vehicleTypeId === vehicleTypeId && d.online && d.verified !== false);
  const zones = (memoryCities.find((c) => c.id === cityId) || city).zonesEn || [];

  const ride = {
    id: `ride_${Date.now()}`,
    passengerId,
    cityId,
    cityName: city.nameEn,
    vehicleTypeId,
    vehicleName: vehicle.nameEn,
    driverId: matchedDriver?.id || null,
    driverName: matchedDriver?.name || null,
    pickupLabel: pickupLabel || zones[0] || 'Pickup',
    destinationLabel: destinationLabel || zones[1] || 'Destination',
    stops: stopsJson,
    distanceKm,
    estimatedFare: estimateFare(distanceKm, vehicleTypeId),
    status: 'REQUESTED',
    rating: null,
    createdAt: new Date().toISOString(),
  };
  memoryRides.push(ride);
  emitRideUpdate(ride.id, { rideId: ride.id, status: 'REQUESTED', type: 'new_ride', driverId: ride.driverId });
  res.status(201).json(ride);
});

router.patch('/:id/status', requireAuth, validateBody(updateRideStatusSchema), async (req, res) => {
  const rideId = String(req.params['id']);
  const { status: statusInput } = req.body as { status: string };
  const status = toRideStatus(statusInput);
  const role = String(req.staff?.role || '').toLowerCase();
  const userId = req.staff?.staffId;

  if (prisma) {
    const currentRide = await prisma.ride.findUnique({
      where: { id: rideId },
      include: {
        passenger: { include: { deviceTokens: true } },
        driver: { include: { user: { include: { deviceTokens: true } } } },
      },
    }).catch(() => null);
    if (!currentRide) return res.status(404).json({ error: 'Ride not found' });

    const data: Prisma.RideUncheckedUpdateInput = { status };
    let actingDriverId: string | null = null;

    if (!isStaffRole(role)) {
      if (role === 'driver') {
        const driver = await prisma.driver.findUnique({ where: { userId }, include: { vehicle: true } }).catch(() => null);
        if (!driver) return res.status(403).json({ error: 'Driver profile not found' });
        actingDriverId = driver.id;

        const compatible = currentRide.cityId === driver.cityId && currentRide.vehicleTypeId === driver.vehicle?.vehicleTypeId;
        if (!compatible) return res.status(403).json({ error: 'Ride is not compatible with this driver' });
        if (currentRide.driverId && currentRide.driverId !== driver.id) {
          return res.status(409).json({ error: 'Ride already assigned to another driver' });
        }
        if (status === RideStatus.ACCEPTED && !currentRide.driverId) {
          data.driverId = driver.id;
        }
      } else {
        if (currentRide.passengerId !== userId) return res.status(403).json({ error: 'You do not have access to this ride' });
        if (status !== RideStatus.CANCELLED) return res.status(403).json({ error: 'Passengers can only cancel rides' });
      }
    }

    const ride = await prisma.ride.update({
      where: { id: rideId },
      data,
      include: {
        passenger: { include: { deviceTokens: true } },
        driver: { include: { user: { include: { deviceTokens: true } } } },
      },
    }).catch(() => null);
    if (!ride) return res.status(404).json({ error: 'Ride not found' });

    if (actingDriverId && [RideStatus.ACCEPTED, RideStatus.COMPLETED, RideStatus.CANCELLED].includes(status)) {
      await prisma.driver.update({ where: { id: actingDriverId }, data: { isOnline: true } }).catch(() => null);
    }

    // Broadcast status change via WebSocket
    emitRideUpdate(ride.id, { rideId: ride.id, status, driverId: ride.driverId });

    // Push to passenger
    const passengerTokens = ride.passenger?.deviceTokens.map((d: { token: string }) => d.token) || [];
    if (passengerTokens.length) {
      const msg = rideStatusMessage(status, 'ar');
      if (msg) sendPushNotifications(passengerTokens, msg.title, msg.body, { rideId: ride.id, status }).catch(() => null);
    }

    // Push to online drivers when no driver assigned yet
    if (status === RideStatus.REQUESTED && !ride.driverId) {
      const onlineDrivers = await prisma.driver.findMany({
        where: { cityId: ride.cityId, isOnline: true, isVerified: true, vehicle: { vehicleTypeId: ride.vehicleTypeId } },
        include: { user: { include: { deviceTokens: true } } },
      });
      const driverTokens = onlineDrivers.flatMap((d) => d.user.deviceTokens.map((t) => t.token));
      if (driverTokens.length) {
        sendPushNotifications(
          driverTokens,
          'طلب رحلة جديد',
          `وصل طلب من ${ride.pickupLabel} إلى ${ride.destinationLabel}`,
          { rideId: ride.id, type: 'new_ride' }
        ).catch(() => null);
      }
    }

    // Auto-credit driver earnings on completion
    if (status === RideStatus.COMPLETED && ride.driverId && ride.driver?.user) {
      const earnAmount = Number(ride.estimatedFare || 0);
      if (earnAmount > 0) {
        const driverUserId = ride.driver.user.id;
        const driverTokens = ride.driver.user.deviceTokens.map((d: { token: string }) => d.token);
        prisma.wallet.upsert({
          where: { userId: driverUserId },
          update: { balance: { increment: earnAmount } },
          create: { userId: driverUserId, balance: earnAmount },
        }).then(async (w) => {
          await prisma!.walletTransaction.create({
            data: { walletId: w.id, amount: earnAmount, type: 'DRIVER_EARNING', description: 'أرباح رحلة', rideId: ride.id },
          });
          if (driverTokens.length) {
            sendPushNotifications(driverTokens, 'تم إضافة أرباحك', `${earnAmount} SDG`, { type: 'earnings', rideId: ride.id }).catch(() => null);
          }
        }).catch(() => null);
      }
    }

    logger.info('Ride status updated', { rideId: ride.id, status, driverId: ride.driverId });
    return res.json(ride);
  }

  const ride = memoryRides.find((r) => r.id === rideId);
  if (!ride) return res.status(404).json({ error: 'Ride not found' });

  if (!isStaffRole(role)) {
    if (role === 'driver') {
      const driver = getMemoryDriverForRequest(role, req.staff?.username || '');
      if (!driver) return res.status(403).json({ error: 'Driver profile not found' });
      if (ride.driverId && ride.driverId !== driver.id) return res.status(409).json({ error: 'Ride already assigned to another driver' });
      if (status === RideStatus.ACCEPTED && !ride.driverId) {
        ride.driverId = driver.id;
        ride.driverName = driver.name;
      }
    } else {
      if (ride.passengerId !== userId) return res.status(403).json({ error: 'You do not have access to this ride' });
      if (status !== RideStatus.CANCELLED) return res.status(403).json({ error: 'Passengers can only cancel rides' });
    }
  }

  ride.status = status;
  ride.updatedAt = new Date().toISOString();

  emitRideUpdate(ride.id, { rideId: ride.id, status, driverId: ride.driverId });

  const passengerTokens = memoryTokens.filter((t) => ride.passengerId && t.userId === ride.passengerId).map((t) => t.token);
  if (passengerTokens.length) {
    const msg = rideStatusMessage(status, 'ar');
    if (msg) sendPushNotifications(passengerTokens, msg.title, msg.body, { rideId: ride.id, status }).catch(() => null);
  }

  res.json(ride);
});

router.patch('/:id/rating', requireAuth, validateBody(rateRideSchema), async (req, res) => {
  const rideId = String(req.params['id']);
  const { rating } = req.body as { rating: number };
  const role = String(req.staff?.role || '').toLowerCase();
  const userId = req.staff?.staffId;

  if (prisma) {
    const currentRide = await prisma.ride.findUnique({ where: { id: rideId } }).catch(() => null);
    if (!currentRide) return res.status(404).json({ error: 'Ride not found' });
    if (!isStaffRole(role) && currentRide.passengerId !== userId) {
      return res.status(403).json({ error: 'You do not have access to this ride' });
    }

    const ride = await prisma.ride
      .update({ where: { id: rideId }, data: { rating, status: RideStatus.COMPLETED } })
      .catch(() => null);
    if (!ride) return res.status(404).json({ error: 'Ride not found' });
    emitRideUpdate(ride.id, { rideId: ride.id, status: 'COMPLETED', rating });
    return res.json(ride);
  }

  const ride = memoryRides.find((r) => r.id === rideId);
  if (!ride) return res.status(404).json({ error: 'Ride not found' });
  if (!isStaffRole(role) && ride.passengerId !== userId) {
    return res.status(403).json({ error: 'You do not have access to this ride' });
  }
  ride.rating = rating;
  ride.status = 'COMPLETED';
  ride.updatedAt = new Date().toISOString();
  emitRideUpdate(ride.id, { rideId: ride.id, status: 'COMPLETED', rating });
  res.json(ride);
});

export default router;
