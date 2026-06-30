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
import { dispatchRideToDrivers, handleDriverAccepted, handleDriverRejection, handlePassengerCancellation } from '../services/dispatchService.js';

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
    // Reject suspended passengers
    if (passengerId) {
      const passenger = await prisma.user.findUnique({ where: { id: passengerId } }).catch(() => null);
      if (passenger?.suspendedUntil && passenger.suspendedUntil > new Date()) {
        return res.status(403).json({
          error: 'account_suspended',
          suspendedUntil: passenger.suspendedUntil,
          message: 'حسابك معلق مؤقتاً بسبب تجاوز حد الإلغاء اليومي',
        });
      }
    }

    const vehicle = await prisma.vehicleType.findUnique({ where: { id: vehicleTypeId } });
    const selectedVehicle = vehicle || findVehicleType(vehicleTypeId);

    // Create ride without a driver — dispatch will find and notify eligible drivers
    const ride = await prisma.ride.create({
      data: {
        passengerId,
        cityId,
        vehicleTypeId,
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

    // Notify passenger's ride room of initial state
    emitRideUpdate(ride.id, { rideId: ride.id, status: 'REQUESTED', type: 'new_ride' });

    // Dispatch to nearest available drivers (non-blocking)
    dispatchRideToDrivers(ride.id).catch(() => null);

    logger.info('Ride created', { rideId: ride.id, cityId, vehicleTypeId, passengerId });
    return res.status(201).json(ride);
  }

  const city = findCity(cityId);
  const vehicle = findVehicleType(vehicleTypeId);
  const zones = (memoryCities.find((c) => c.id === cityId) || city).zonesEn || [];

  const ride = {
    id: `ride_${Date.now()}`,
    passengerId,
    cityId,
    cityName: city.nameEn,
    vehicleTypeId,
    vehicleName: vehicle.nameEn,
    driverId: null,
    driverName: null,
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
  emitRideUpdate(ride.id, { rideId: ride.id, status: 'REQUESTED', type: 'new_ride' });
  // Memory mode: emit to all driver sockets
  dispatchRideToDrivers(ride.id).catch(() => null);
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

    // When a driver accepts, mark other offers expired and notify sibling drivers
    if (status === RideStatus.ACCEPTED && actingDriverId) {
      handleDriverAccepted(actingDriverId, rideId).catch(() => null);
    }

    // When passenger cancels, enforce daily cancellation limit
    if (status === RideStatus.CANCELLED && ride.passengerId && !isStaffRole(role) && role !== 'driver') {
      handlePassengerCancellation(ride.passengerId).catch(() => null);
    }

    // Broadcast status change via WebSocket
    emitRideUpdate(ride.id, { rideId: ride.id, status, driverId: ride.driverId });

    // Push to passenger
    const passengerTokens = ride.passenger?.deviceTokens.map((d: { token: string }) => d.token) || [];
    if (passengerTokens.length) {
      const msg = rideStatusMessage(status, 'ar');
      if (msg) sendPushNotifications(passengerTokens, msg.title, msg.body, { rideId: ride.id, status }).catch(() => null);
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

// Driver rejects a ride offer without changing its status for other drivers
router.post('/:id/reject', requireAuth, async (req, res) => {
  const rideId = String(req.params['id']);
  const role = String(req.staff?.role || '').toLowerCase();
  const userId = req.staff?.staffId;

  if (role !== 'driver') return res.status(403).json({ error: 'Only drivers can reject rides' });

  if (prisma) {
    const driver = await prisma.driver.findUnique({ where: { userId } }).catch(() => null);
    if (!driver) return res.status(403).json({ error: 'Driver profile not found' });

    const result = await handleDriverRejection(driver.id, rideId);
    logger.info('Driver rejected ride', { rideId, driverId: driver.id, ...result });
    return res.json({ ok: true, ...result });
  }

  // Memory mode — just acknowledge, no penalty tracking
  res.json({ ok: true, suspended: false, deducted: false });
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
