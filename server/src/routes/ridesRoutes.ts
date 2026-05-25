import { Router } from 'express';
import { prisma } from '../db.js';
import { memoryRides, memoryDrivers, memoryTokens } from '../store.js';
import { memoryCities, memoryVehicleTypes } from './configStore.js';
import { findCity, findVehicleType, estimateFare } from '../config.js';
import { RideStatus } from '@prisma/client';
import { sendPushNotifications, rideStatusMessage } from '../services/notificationService.js';

const router = Router();

function toRideStatus(value: string): RideStatus {
  const upper = value.toUpperCase();
  if (['REQUESTED', 'ACCEPTED', 'ARRIVING', 'ACTIVE', 'COMPLETED', 'CANCELLED'].includes(upper)) {
    return upper as RideStatus;
  }
  return RideStatus.REQUESTED;
}

router.get('/', async (_req, res) => {
  if (prisma) {
    const rides = await prisma.ride.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { city: true, vehicleType: true, driver: { include: { user: true } } },
    });
    return res.json(rides);
  }
  res.json(memoryRides.slice().reverse());
});

router.get('/:id', async (req, res) => {
  if (prisma) {
    const ride = await prisma.ride.findUnique({
      where: { id: req.params.id },
      include: { city: true, vehicleType: true, driver: { include: { user: true } } },
    });
    if (!ride) return res.status(404).json({ error: 'Ride not found' });
    return res.json(ride);
  }
  const ride = memoryRides.find((r) => r.id === req.params.id);
  if (!ride) return res.status(404).json({ error: 'Ride not found' });
  res.json(ride);
});

router.post('/', async (req, res) => {
  const distanceKm = Number(req.body.distanceKm || 2);
  const cityId = String(req.body.cityId || 'rufaa');
  const vehicleTypeId = String(req.body.vehicleTypeId || 'rickshaw');

  if (prisma) {
    const vehicle = await prisma.vehicleType.findUnique({ where: { id: vehicleTypeId } });
    const selectedVehicle = vehicle || findVehicleType(vehicleTypeId);
    const matchedDriver = await prisma.driver.findFirst({
      where: { cityId, isOnline: true, isVerified: true, vehicle: { vehicleTypeId } },
    });
    const ride = await prisma.ride.create({
      data: {
        cityId,
        vehicleTypeId,
        driverId: matchedDriver?.id,
        pickupLabel: String(req.body.pickupLabel || 'Pickup'),
        destinationLabel: String(req.body.destinationLabel || 'Destination'),
        distanceKm,
        estimatedFare: Math.max(
          Math.round(selectedVehicle.baseFare + distanceKm * selectedVehicle.perKmFare),
          selectedVehicle.minimumFare
        ),
        status: RideStatus.REQUESTED,
      },
    });

    // Notify online drivers in the city about the new ride request
    const onlineDrivers = await prisma.driver.findMany({
      where: { cityId, isOnline: true, isVerified: true },
      include: { user: { include: { deviceTokens: true } } },
    });
    const driverTokens = onlineDrivers.flatMap((d) => d.user.deviceTokens.map((t) => t.token));
    if (driverTokens.length) {
      sendPushNotifications(
        driverTokens,
        'طلب رحلة جديد',
        `من ${ride.pickupLabel} إلى ${ride.destinationLabel}`,
        { rideId: ride.id, type: 'new_ride' }
      ).catch(() => null);
    }

    return res.status(201).json(ride);
  }

  const city = findCity(cityId);
  const vehicle = findVehicleType(vehicleTypeId);
  const matchedDriver = memoryDrivers.find((d) => d.cityId === cityId && d.vehicleTypeId === vehicleTypeId && d.online);
  const zones = (memoryCities.find((c) => c.id === cityId) || city).zonesEn || [];

  const ride = {
    id: `ride_${Date.now()}`,
    cityId,
    cityName: city.nameEn,
    vehicleTypeId,
    vehicleName: vehicle.nameEn,
    driverId: matchedDriver?.id || null,
    driverName: matchedDriver?.name || null,
    pickupLabel: String(req.body.pickupLabel || zones[0] || 'Pickup'),
    destinationLabel: String(req.body.destinationLabel || zones[1] || 'Destination'),
    distanceKm,
    estimatedFare: estimateFare(distanceKm, vehicleTypeId),
    status: 'REQUESTED',
    rating: null,
    createdAt: new Date().toISOString(),
  };
  memoryRides.push(ride);
  res.status(201).json(ride);
});

router.patch('/:id/status', async (req, res) => {
  const status = toRideStatus(String(req.body.status || 'REQUESTED'));

  if (prisma) {
    const ride = await prisma.ride
      .update({
        where: { id: req.params.id },
        data: { status },
        include: { passenger: { include: { deviceTokens: true } }, driver: { include: { user: { include: { deviceTokens: true } } } } },
      })
      .catch(() => null);
    if (!ride) return res.status(404).json({ error: 'Ride not found' });

    // Notify passenger about their ride status
    const passengerTokens = ride.passenger?.deviceTokens.map((d) => d.token) || [];
    if (passengerTokens.length) {
      const msg = rideStatusMessage(status, 'ar');
      if (msg) sendPushNotifications(passengerTokens, msg.title, msg.body, { rideId: ride.id, status }).catch(() => null);
    }

    // Notify driver when a new ride is requested in their city
    if (status === RideStatus.REQUESTED && !ride.driverId) {
      const onlineDrivers = await prisma.driver.findMany({
        where: { cityId: ride.cityId, isOnline: true, isVerified: true },
        include: { user: { include: { deviceTokens: true } } },
      });
      const driverTokens = onlineDrivers.flatMap((d) => d.user.deviceTokens.map((t) => t.token));
      if (driverTokens.length) {
        sendPushNotifications(driverTokens, 'طلب رحلة جديد', `وصل طلب من ${ride.pickupLabel} إلى ${ride.destinationLabel}`, { rideId: ride.id, type: 'new_ride' }).catch(() => null);
      }
    }

    return res.json(ride);
  }

  const ride = memoryRides.find((r) => r.id === req.params.id);
  if (!ride) return res.status(404).json({ error: 'Ride not found' });
  ride.status = status;
  ride.updatedAt = new Date().toISOString();

  // In-memory: best-effort push using stored tokens
  const passengerTokens = memoryTokens.filter((t) => ride.passengerId && t.userId === ride.passengerId).map((t) => t.token);
  if (passengerTokens.length) {
    const msg = rideStatusMessage(status, 'ar');
    if (msg) sendPushNotifications(passengerTokens, msg.title, msg.body, { rideId: ride.id, status }).catch(() => null);
  }

  res.json(ride);
});

router.patch('/:id/rating', async (req, res) => {
  const rating = Number(req.body.rating || 0);
  if (rating < 1 || rating > 5) return res.status(400).json({ error: 'Rating must be between 1 and 5' });

  if (prisma) {
    const ride = await prisma.ride
      .update({ where: { id: req.params.id }, data: { rating, status: RideStatus.COMPLETED } })
      .catch(() => null);
    if (!ride) return res.status(404).json({ error: 'Ride not found' });
    return res.json(ride);
  }

  const ride = memoryRides.find((r) => r.id === req.params.id);
  if (!ride) return res.status(404).json({ error: 'Ride not found' });
  ride.rating = rating;
  ride.status = 'COMPLETED';
  ride.updatedAt = new Date().toISOString();
  res.json(ride);
});

export default router;
