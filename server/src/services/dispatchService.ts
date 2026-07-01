import { prisma } from '../db.js';
import { getIo } from './socketService.js';
import { getRecentDriverLocation } from './socketService.js';
import { sendPushNotifications } from './notificationService.js';
import { logger } from './logger.js';
import { getDispatchSettings } from './settingsService.js';

const MAX_DISPATCH_RETRIES = 3;

function isToday(date: Date | null | undefined): boolean {
  if (!date) return false;
  const d = new Date(date);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function notifyNoDrivers(rideId: string, passengerId: string | null): Promise<void> {
  getIo()?.to(`ride:${rideId}`).emit('ride:no_drivers', { rideId });

  if (!passengerId || !prisma) return;

  const passenger = await prisma.user
    .findUnique({ where: { id: passengerId }, include: { deviceTokens: true } })
    .catch(() => null);

  const tokens = passenger?.deviceTokens.map((t: { token: string }) => t.token) ?? [];
  if (tokens.length) {
    sendPushNotifications(
      tokens,
      'لا يوجد سائقون متاحون',
      'لا يوجد سائقون في منطقتك الآن. يرجى المحاولة لاحقاً.',
      { rideId, type: 'no_drivers' }
    ).catch(() => null);
  }
  logger.info('dispatch: no_drivers emitted to passenger', { rideId });
}

/**
 * Find all eligible drivers in the same city/vehicle-type, sort by proximity
 * when GPS data is available, create RideOffer records, and push offers.
 * Retries up to MAX_DISPATCH_RETRIES times if no driver accepts within timeout.
 */
export async function dispatchRideToDrivers(rideId: string, attempt = 0): Promise<void> {
  const cfg = await getDispatchSettings();

  if (!prisma) {
    getIo()?.emit('ride:offer', { rideId });
    return;
  }

  const ride = await prisma.ride.findUnique({ where: { id: rideId } });
  if (!ride || ride.driverId) return;

  // If ride is no longer waiting, bail
  if (ride.status !== 'REQUESTED') return;

  const now = new Date();
  const eligible = await prisma.driver.findMany({
    where: {
      cityId: ride.cityId,
      isOnline: true,
      isVerified: true,
      vehicle: { vehicleTypeId: ride.vehicleTypeId },
      OR: [{ suspendedUntil: null }, { suspendedUntil: { lt: now } }],
    },
    include: { user: { include: { deviceTokens: true } } },
  });

  if (!eligible.length) {
    logger.info('dispatch: no eligible drivers', { rideId, attempt });
    if (attempt >= MAX_DISPATCH_RETRIES) {
      await notifyNoDrivers(rideId, ride.passengerId);
    } else {
      setTimeout(() => dispatchRideToDrivers(rideId, attempt + 1).catch(() => null), cfg.offerTimeoutSeconds * 1000);
    }
    return;
  }

  // Sort by distance to pickup using in-memory GPS data when available
  const pLat = (ride as Record<string, unknown>).pickupLat as number | null;
  const pLng = (ride as Record<string, unknown>).pickupLng as number | null;
  if (pLat !== null && pLng !== null && pLat !== undefined && pLng !== undefined) {
    eligible.sort((a: { id: string }, b: { id: string }) => {
      const locA = getRecentDriverLocation(a.id);
      const locB = getRecentDriverLocation(b.id);
      const distA = locA ? haversineKm(pLat, pLng, locA.lat, locA.lng) : Infinity;
      const distB = locB ? haversineKm(pLat, pLng, locB.lat, locB.lng) : Infinity;
      return distA - distB;
    });
  }

  await prisma.rideOffer.createMany({
    data: eligible.map((d: { id: string }) => ({ rideId, driverId: d.id })),
    skipDuplicates: true,
  });

  const io = getIo();
  const payload = {
    rideId: ride.id,
    pickupLabel: ride.pickupLabel,
    destinationLabel: ride.destinationLabel,
    estimatedFare: ride.estimatedFare,
    distanceKm: ride.distanceKm,
    expiresIn: cfg.offerTimeoutSeconds,
  };

  const pushTokens: string[] = [];
  for (const driver of eligible) {
    io?.to(`driver:${driver.id}`).emit('ride:offer', payload);
    pushTokens.push(...driver.user.deviceTokens.map((t: { token: string }) => t.token));
  }

  if (pushTokens.length) {
    sendPushNotifications(
      pushTokens,
      'طلب رحلة جديد 🚗',
      `من ${ride.pickupLabel} إلى ${ride.destinationLabel} — ${ride.estimatedFare} SDG`,
      { rideId: ride.id, type: 'ride_offer' }
    ).catch(() => null);
  }

  // Auto-expire pending offers after timeout, then retry or notify no-drivers
  setTimeout(async () => {
    if (!prisma) return;

    await prisma.rideOffer
      .updateMany({
        where: { rideId, status: 'PENDING' },
        data: { status: 'EXPIRED', respondedAt: new Date() },
      })
      .catch(() => null);

    // Only retry if ride was not accepted yet
    const current = await prisma.ride.findUnique({ where: { id: rideId } }).catch(() => null);
    if (!current || current.driverId || current.status !== 'REQUESTED') return;

    if (attempt >= MAX_DISPATCH_RETRIES) {
      await notifyNoDrivers(rideId, ride.passengerId);
    } else {
      dispatchRideToDrivers(rideId, attempt + 1).catch(() => null);
    }
  }, cfg.offerTimeoutSeconds * 1000);

  logger.info('dispatch: offers sent', { rideId, attempt, count: eligible.length });
}

/**
 * Called when a driver accepts a ride. Marks their offer ACCEPTED, expires
 * all other PENDING offers, and notifies sibling drivers the ride is taken.
 */
export async function handleDriverAccepted(driverId: string, rideId: string): Promise<void> {
  if (!prisma) return;

  await prisma.rideOffer
    .updateMany({
      where: { rideId, driverId, status: 'PENDING' },
      data: { status: 'ACCEPTED', respondedAt: new Date() },
    })
    .catch(() => null);

  const sibling = await prisma.rideOffer.findMany({
    where: { rideId, status: 'PENDING' },
    select: { driverId: true },
  });

  if (sibling.length) {
    await prisma.rideOffer
      .updateMany({
        where: { rideId, status: 'PENDING' },
        data: { status: 'EXPIRED', respondedAt: new Date() },
      })
      .catch(() => null);

    const io = getIo();
    for (const { driverId: sid } of sibling) {
      io?.to(`driver:${sid}`).emit('ride:taken', { rideId });
    }
  }
}

/**
 * Driver explicitly rejects a ride offer.
 * Enforces daily rejection limit; suspends and optionally deducts from wallet.
 */
export async function handleDriverRejection(
  driverId: string,
  rideId: string
): Promise<{ suspended: boolean; suspendedUntil: Date | null; deducted: boolean }> {
  if (!prisma) return { suspended: false, suspendedUntil: null, deducted: false };

  const cfg = await getDispatchSettings();

  await prisma.rideOffer
    .updateMany({
      where: { rideId, driverId, status: 'PENDING' },
      data: { status: 'REJECTED', respondedAt: new Date() },
    })
    .catch(() => null);

  const driver = await prisma.driver.findUnique({
    where: { id: driverId },
    include: { user: { include: { deviceTokens: true } } },
  });
  if (!driver) return { suspended: false, suspendedUntil: null, deducted: false };

  const today = isToday(driver.lastRejectionDate);
  const count = today ? driver.dailyRejections : 0;
  const newCount = count + 1;
  const now = new Date();

  let suspended = false;
  let suspendedUntil: Date | null = null;
  let deducted = false;

  const update: Record<string, unknown> = {
    dailyRejections: newCount,
    lastRejectionDate: now,
  };

  if (newCount >= cfg.dailyRejectionLimit) {
    const newViolations = driver.violationCount + 1;
    const hours =
      newViolations === 1 ? cfg.suspensionHoursFirst : cfg.suspensionHoursDriverRepeat;
    suspendedUntil = new Date(now.getTime() + hours * 3_600_000);

    update.suspendedUntil = suspendedUntil;
    update.isOnline = false;
    update.violationCount = newViolations;
    update.dailyRejections = 0;
    suspended = true;

    if (newViolations > 1) {
      const wallet = await prisma.wallet.findUnique({ where: { userId: driver.userId } });
      if (wallet && wallet.balance >= cfg.walletDeductionSDG) {
        await prisma.$transaction([
          prisma.wallet.update({
            where: { id: wallet.id },
            data: { balance: { decrement: cfg.walletDeductionSDG } },
          }),
          prisma.walletTransaction.create({
            data: {
              walletId: wallet.id,
              amount: -cfg.walletDeductionSDG,
              type: 'RIDE_PAYMENT',
              description: `خصم مخالفة رفض الرحلات — المخالفة #${newViolations}`,
            },
          }),
        ]);
        deducted = true;
      }
    }

    const tokens = driver.user.deviceTokens.map((t: { token: string }) => t.token);
    if (tokens.length) {
      const msg = deducted
        ? `تجاوزت حد الرفض اليومي. حسابك معلق ${hours} ساعة وتم خصم ${cfg.walletDeductionSDG} SDG من محفظتك.`
        : `تجاوزت حد الرفض اليومي. حسابك معلق لمدة ${hours} ساعة.`;
      sendPushNotifications(tokens, 'تم تعليق حسابك مؤقتاً', msg, {
        type: 'suspension',
      }).catch(() => null);
    }

    getIo()?.to(`driver:${driverId}`).emit('driver:suspended', {
      suspendedUntil,
      hours,
      deducted,
      deductedAmount: deducted ? cfg.walletDeductionSDG : 0,
    });

    logger.info('driver suspended', {
      driverId,
      violations: newViolations,
      suspendedUntil,
      deducted,
    });
  }

  await prisma.driver.update({ where: { id: driverId }, data: update as never });
  return { suspended, suspendedUntil, deducted };
}

/**
 * Passenger cancels a ride.
 * Enforces daily cancellation limit and suspends passenger if exceeded.
 */
export async function handlePassengerCancellation(
  passengerId: string
): Promise<{ suspended: boolean; suspendedUntil: Date | null }> {
  if (!prisma) return { suspended: false, suspendedUntil: null };

  const cfg = await getDispatchSettings();

  const user = await prisma.user.findUnique({
    where: { id: passengerId },
    include: { deviceTokens: true },
  });
  if (!user) return { suspended: false, suspendedUntil: null };

  const today = isToday(user.lastCancellationDate);
  const count = today ? user.dailyCancellations : 0;
  const newCount = count + 1;
  const now = new Date();

  let suspended = false;
  let suspendedUntil: Date | null = null;

  const update: Record<string, unknown> = {
    dailyCancellations: newCount,
    lastCancellationDate: now,
  };

  if (newCount >= cfg.dailyCancellationLimit) {
    const isRepeat =
      user.suspendedUntil !== null &&
      user.suspendedUntil > new Date(now.getTime() - 7 * 24 * 3_600_000);
    const hours = isRepeat
      ? cfg.suspensionHoursPassengerRepeat
      : cfg.suspensionHoursPassengerFirst;
    suspendedUntil = new Date(now.getTime() + hours * 3_600_000);

    update.suspendedUntil = suspendedUntil;
    update.dailyCancellations = 0;
    suspended = true;

    const tokens = user.deviceTokens.map((t: { token: string }) => t.token);
    if (tokens.length) {
      sendPushNotifications(
        tokens,
        'تم تعليق حسابك مؤقتاً',
        `تجاوزت حد الإلغاء اليومي. حسابك معلق لمدة ${hours} ساعة.`,
        { type: 'suspension' }
      ).catch(() => null);
    }

    logger.info('passenger suspended', { passengerId, suspendedUntil });
  }

  await prisma.user.update({ where: { id: passengerId }, data: update as never });
  return { suspended, suspendedUntil };
}
