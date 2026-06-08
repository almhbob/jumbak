import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';

export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const errors = result.error.issues.map((e) => ({ field: e.path.join('.'), message: e.message }));
      return res.status(400).json({ error: 'Validation failed', errors });
    }
    req.body = result.data;
    next();
  };
}

// ─── Shared field types ────────────────────────────────────────────────────
const phone = z.string().min(7).max(20).regex(/^\+?[\d\s\-()]+$/, 'Invalid phone number');
const otp = z.string().length(6).regex(/^\d{6}$/, 'OTP must be 6 digits');

// ─── Auth schemas ──────────────────────────────────────────────────────────
export const requestOtpSchema = z.object({
  phone: phone,
});

export const verifyOtpSchema = z.object({
  phone: phone,
  code: otp,
  name: z.string().max(100).optional(),
  role: z.enum(['PASSENGER', 'DRIVER', 'ADMIN']).optional(),
});

export const staffLoginSchema = z.object({
  username: z.string().min(2).max(60),
  password: z.string().min(4).max(100),
  role: z.string().optional(),
});

// ─── Ride schemas ──────────────────────────────────────────────────────────
export const createRideSchema = z.object({
  cityId: z.string().min(1).max(60),
  vehicleTypeId: z.string().min(1).max(60),
  pickupLabel: z.string().min(1).max(200),
  destinationLabel: z.string().min(1).max(200),
  distanceKm: z.number().positive().max(500).optional(),
  stops: z.array(z.string().max(200)).max(10).optional(),
});

export const updateRideStatusSchema = z.object({
  status: z.enum(['REQUESTED', 'ACCEPTED', 'ARRIVING', 'ACTIVE', 'COMPLETED', 'CANCELLED']),
});

export const rateRideSchema = z.object({
  rating: z.number().int().min(1).max(5),
});

// ─── Driver schemas ────────────────────────────────────────────────────────
export const registerDriverSchema = z.object({
  phone: phone,
  name: z.string().min(2).max(100),
  cityId: z.string().min(1).max(60),
  vehicleTypeId: z.string().min(1).max(60),
  plateNo: z.string().min(1).max(30),
  color: z.string().min(1).max(40),
  model: z.string().min(1).max(60),
  nationalId: z.string().max(30).optional(),
  chassisNo: z.string().max(30).optional(),
  trafficId: z.string().max(30).optional(),
  bankAccount: z.string().max(60).optional(),
  guarantorName: z.string().max(100).optional(),
  guarantorPhone: phone.optional(),
  guarantorAddress: z.string().max(200).optional(),
});

export const reviewApplicationSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  reviewedBy: z.string().max(100).optional(),
  notes: z.string().max(500).optional(),
});

// ─── Wallet schemas ────────────────────────────────────────────────────────
export const walletTopupSchema = z.object({
  amount: z.number().int().positive().max(1_000_000),
  description: z.string().max(200).optional(),
});

export const walletPaySchema = z.object({
  amount: z.number().int().positive().max(1_000_000),
  rideId: z.string().max(60).optional(),
  description: z.string().max(200).optional(),
});

export const walletWithdrawSchema = z.object({
  amount: z.number().int().positive().max(1_000_000),
  bankAccount: z.string().min(5).max(100),
  description: z.string().max(200).optional(),
});
