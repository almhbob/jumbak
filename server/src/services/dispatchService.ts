import { prisma } from '../db.js';
import { getIo } from './socketService.js';
import { sendPushNotifications } from './notificationService.js';
import { logger } from './logger.js';

const DAILY_REJECTION_LIMIT = 2;
const DAILY_CANCELLATION_LIMIT = 2;
const OFFER_TIMEOUT_MS = 60_000;
const SUSPENSION_HOURS_FIRST = 12;
const SUSPENSION_HOURS_DRIVER_REPEAT = 24;
const SUSPENSION_HOURS_PASSENGER_REPEAT = 48;
const WALLET_DEDUCTION_SDG = 50;

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

/**
 * Find all eligible drivers in the same city/vehicle-type, create RideOffer
 * records, and push a ride:offer socket event + push notification to each.
 */
export async function dispatchRideToDrivers(rideId: string): Promise<void> {
  if (!prisma) {
    // Memory mode: broadcast to any connected client listening on the generic channel
    getIo()?.emit('ride:offer', { rideId });
    return;
  }

  const ride = await prisma.ride.findUnique({ where: { id: rideId } });
  if (!ride || ride.driverId) return;

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
    logger.info('dispatch: no eligible drivers', { rideId });
    return;
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
    expiresIn: OFFER_TIMEOUT_MS / 1000,
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

  // Auto-expire pending offers after timeout
  setTimeout(async () => {
    if (!prisma) return;
    await prisma.rideOffer.updateMany({
      where: { rideId, status: 'PENDING' },
      data: { status: 'EXPIRED', respondedAt: new Date() },
    }).catch(() => null);
  }, OFFER_TIMEOUT_MS);

  logger.info('dispatch: offers sent', { rideId, count: eligible.length });
}

/**
 * Called when a driver accepts a ride. Marks their offer ACCEPTED, expires
 * all other PENDING offers, and notifies sibling drivers the ride is taken.
 */
export async function handleDriverAccepted(driverId: string, rideId: string): Promise<void> {
  if (!prisma) return;

  await prisma.rideOffer.updateMany({
    where: { rideId, driverId, status: 'PENDING' },
    data: { status: 'ACCEPTED', respondedAt: new Date() },
  }).catch(() => null);

  const sibling = await prisma.rideOffer.findMany({
    where: { rideId, status: 'PENDING' },
    select: { driverId: true },
  });

  if (sibling.length) {
    await prisma.rideOffer.updateMany({
      where: { rideId, status: 'PENDING' },
      data: { status: 'EXPIRED', respondedAt: new Date() },
    }).catch(() => null);

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

  await prisma.rideOffer.updateMany({
    where: { rideId, driverId, status: 'PENDING' },
    data: { status: 'REJECTED', respondedAt: new Date() },
  }).catch(() => null);

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

  if (newCount >= DAILY_REJECTION_LIMIT) {
    const newViolations = driver.violationCount + 1;
    const hours = newViolations === 1 ? SUSPENSION_HOURS_FIRST : SUSPENSION_HOURS_DRIVER_REPEAT;
    suspendedUntil = new Date(now.getTime() + hours * 3_600_000);

    update.suspendedUntil = suspendedUntil;
    update.isOnline = false;
    update.violationCount = newViolations;
    update.dailyRejections = 0;
    suspended = true;

    if (newViolations > 1) {
      const wallet = await prisma.wallet.findUnique({ where: { userId: driver.userId } });
      if (wallet && wallet.balance >= WALLET_DEDUCTION_SDG) {
        await prisma.$transaction([
          prisma.wallet.update({
            where: { id: wallet.id },
            data: { balance: { decrement: WALLET_DEDUCTION_SDG } },
          }),
          prisma.walletTransaction.create({
            data: {
              walletId: wallet.id,
              amount: -WALLET_DEDUCTION_SDG,
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
        ? `تجاوزت حد الرفض اليومي. حسابك معلق ${hours} ساعة وتم خصم ${WALLET_DEDUCTION_SDG} SDG من محفظتك.`
        : `تجاوزت حد الرفض اليومي. حسابك معلق لمدة ${hours} ساعة.`;
      sendPushNotifications(tokens, 'تم تعليق حسابك مؤقتاً', msg, { type: 'suspension' }).catch(() => null);
    }

    // Push suspension event to driver's socket room so the app reacts immediately
    getIo()?.to(`driver:${driverId}`).emit('driver:suspended', {
      suspendedUntil,
      hours,
      deducted,
      deductedAmount: deducted ? WALLET_DEDUCTION_SDG : 0,
    });

    logger.info('driver suspended', { driverId, violations: newViolations, suspendedUntil, deducted });
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

  if (newCount >= DAILY_CANCELLATION_LIMIT) {
    const isRepeat = user.suspendedUntil !== null &&
      user.suspendedUntil > new Date(now.getTime() - 7 * 24 * 3_600_000);
    const hours = isRepeat ? SUSPENSION_HOURS_PASSENGER_REPEAT : SUSPENSION_HOURS_FIRST;
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
