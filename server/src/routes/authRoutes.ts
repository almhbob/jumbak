import { Router } from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import { prisma } from '../db.js';
import { memoryStaff, memoryUsers } from '../store.js';
import { signToken, signRefreshToken, verifyRefreshToken } from '../middleware/auth.js';
import { validateBody, requestOtpSchema, verifyOtpSchema, staffLoginSchema } from '../middleware/validate.js';
import { UserRole } from '@prisma/client';
import { verifyFirebaseIdToken } from '../services/firebaseAdmin.js';
import { generateOtp, storeOtp, verifyOtp } from '../services/otpStore.js';
import { sendSms, isSmsConfigured } from '../services/smsService.js';
import { logger } from '../services/logger.js';

const router = Router();

const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  message: { error: 'Too many OTP requests, please wait 10 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const phone = String(req.body?.phone || '').trim();
    return phone || ipKeyGenerator(req.ip ?? '');
  },
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many login attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

type StaffRoleInput = 'operations' | 'supervisor' | 'support' | 'accountant' | 'finance' | 'developer' | 'business';

function normalizeStaffRole(role: string): StaffRoleInput {
  const normalized = String(role || '').toLowerCase();
  if (['supervisor', 'support', 'accountant', 'finance', 'developer', 'business'].includes(normalized)) {
    return normalized as StaffRoleInput;
  }
  return 'operations';
}

function publicStaff(member: {
  id: string; name: string; phone: string | null; email: string | null;
  username: string; role: string; status: string; lastLoginAt: Date | null | string;
}) {
  return {
    id: member.id,
    name: member.name,
    phone: member.phone,
    email: member.email,
    username: member.username,
    role: String(member.role || '').toLowerCase(),
    status: String(member.status || '').toLowerCase(),
    lastLoginAt: member.lastLoginAt,
  };
}

function normalizeUserRole(role?: string): UserRole {
  if (role === 'DRIVER') return UserRole.DRIVER;
  if (role === 'ADMIN') return UserRole.ADMIN;
  return UserRole.PASSENGER;
}

// POST /api/auth/request-otp
router.post('/auth/request-otp', otpLimiter, validateBody(requestOtpSchema), async (req, res) => {
  const { phone } = req.body as { phone: string };

  // Dev/test override: accept any request without sending real SMS
  if (process.env.OTP_OVERRIDE) {
    logger.info('OTP request (override mode)', { phone });
    return res.json({ ok: true, phone, message: 'OTP sent', dev: true });
  }

  if (!isSmsConfigured()) {
    // Generate OTP and return dev_code regardless of environment when SMS is not configured.
    // In production with real AT credentials this block is never reached.
    const code = generateOtp();
    storeOtp(phone, code);
    logger.warn('OTP generated without SMS (AT not configured)', { phone, code });
    return res.json({ ok: true, phone, message: 'OTP generated (no SMS provider)', dev_code: code });
  }

  const code = generateOtp();
  storeOtp(phone, code);

  const sent = await sendSms(phone, `رمز التحقق الخاص بك في جنبك: ${code}\nYour Jnbk OTP: ${code}`);
  if (!sent) {
    return res.status(500).json({ error: 'Failed to send SMS. Please try again.' });
  }

  logger.info('OTP sent via SMS', { phone });
  res.json({ ok: true, phone, message: 'OTP sent' });
});

// POST /api/auth/verify-otp
router.post('/auth/verify-otp', otpLimiter, validateBody(verifyOtpSchema), async (req, res) => {
  const { phone, code, name, role: roleInput } = req.body as {
    phone: string; code: string; name?: string; role?: string;
  };
  const role = normalizeUserRole(roleInput);

  // Override mode: accept the static OTP_OVERRIDE value
  if (process.env.OTP_OVERRIDE) {
    if (code !== process.env.OTP_OVERRIDE) {
      return res.status(401).json({ error: 'Invalid OTP' });
    }
  } else {
    // Verify against the generated code in the store (works for both dev and prod without AT)
    const result = verifyOtp(phone, code);
    if (result !== 'ok') {
      const messages: Record<string, string> = {
        invalid: 'Invalid OTP',
        expired: 'OTP expired, please request a new one',
        too_many_attempts: 'Too many failed attempts, please request a new OTP',
      };
      return res.status(401).json({ error: messages[result] || 'Invalid OTP' });
    }
  }

  if (prisma) {
    const user = await prisma.user.upsert({
      where: { phone },
      update: { name: name || undefined, role },
      create: { phone, name: name || null, role },
    });
    const token = signToken({ staffId: user.id, username: user.phone, role: user.role.toLowerCase() });
    const refreshToken = signRefreshToken({ staffId: user.id, username: user.phone, role: user.role.toLowerCase() });
    logger.info('User authenticated', { userId: user.id, phone, role: user.role });
    return res.json({ ok: true, user: { id: user.id, phone: user.phone, name: user.name, role: user.role }, token, refreshToken });
  }

  let user = memoryUsers.find((u) => u.phone === phone);
  if (!user) {
    user = { id: `user_${Date.now()}`, phone, name: name || null, role, createdAt: new Date().toISOString() };
    memoryUsers.push(user);
  } else {
    user.name = name || user.name;
    user.role = role;
  }
  const token = signToken({ staffId: user.id, username: user.phone, role: user.role.toLowerCase() });
  res.json({ ok: true, user: { id: user.id, phone: user.phone, name: user.name, role: user.role }, token });
});

// POST /api/auth/firebase-verify
router.post('/auth/firebase-verify', loginLimiter, async (req, res) => {
  const idToken = String(req.body.idToken || '').trim();
  const name = String(req.body.name || '').trim() || null;
  const role = normalizeUserRole(String(req.body.role || 'PASSENGER'));

  if (!idToken) return res.status(400).json({ error: 'idToken is required' });

  const decoded = await verifyFirebaseIdToken(idToken);
  if (!decoded) return res.status(401).json({ error: 'Invalid Firebase token' });

  const { phone } = decoded;

  if (prisma) {
    const user = await prisma.user.upsert({
      where: { phone },
      update: { name: name || undefined, role },
      create: { phone, name, role },
    });
    const token = signToken({ staffId: user.id, username: user.phone, role: user.role.toLowerCase() });
    return res.json({ ok: true, user: { id: user.id, phone: user.phone, name: user.name, role: user.role }, token });
  }

  let user = memoryUsers.find((u) => u.phone === phone);
  if (!user) {
    user = { id: `user_${Date.now()}`, phone, name, role, createdAt: new Date().toISOString() };
    memoryUsers.push(user);
  } else {
    if (name) user.name = name;
    user.role = role;
  }
  const token = signToken({ staffId: user.id, username: user.phone, role: user.role.toLowerCase() });
  res.json({ ok: true, user: { id: user.id, phone: user.phone, name: user.name, role: user.role }, token });
});

// POST /api/staff/login
router.post('/staff/login', loginLimiter, validateBody(staffLoginSchema), async (req, res) => {
  const { username: rawUsername, password, role: roleInput } = req.body as {
    username: string; password: string; role?: string;
  };
  const username = rawUsername.toLowerCase();
  const role = normalizeStaffRole(String(roleInput || 'operations'));

  if (prisma) {
    const member = await prisma.staffMember.findUnique({ where: { username } }).catch(() => null);
    if (!member) return res.status(401).json({ error: 'Invalid credentials' });

    const passwordMatch = await bcrypt.compare(password, member.passwordHash);
    if (!passwordMatch) return res.status(401).json({ error: 'Invalid credentials' });

    if (String(member.role).toLowerCase() !== role) return res.status(401).json({ error: 'Invalid credentials' });
    if (member.status !== 'ACTIVE') return res.status(403).json({ error: 'Account is not active' });

    await prisma.staffMember.update({ where: { id: member.id }, data: { lastLoginAt: new Date() } }).catch(() => null);

    const token = signToken({ staffId: member.id, username, role });
    logger.info('Staff login', { username, role });
    return res.json({ ok: true, staff: publicStaff(member), token });
  }

  const member = memoryStaff.find((m) => m.username === username && m.role === role && m.status === 'active');
  if (!member) return res.status(401).json({ error: 'Invalid credentials' });

  const passwordMatch = await bcrypt.compare(password, member.passwordHash);
  if (!passwordMatch) return res.status(401).json({ error: 'Invalid credentials' });

  member.lastLoginAt = new Date().toISOString();
  const token = signToken({ staffId: member.id, username, role });
  const refreshToken = signRefreshToken({ staffId: member.id, username, role });
  res.json({ ok: true, staff: publicStaff(member), token, refreshToken });
});

// POST /api/auth/refresh — get a new access token using a refresh token
router.post('/auth/refresh', (req, res) => {
  const refreshToken = String(req.body.refreshToken || '').trim();
  if (!refreshToken) return res.status(400).json({ error: 'refreshToken is required' });

  const payload = verifyRefreshToken(refreshToken);
  if (!payload) return res.status(401).json({ error: 'Invalid or expired refresh token' });

  const token = signToken({ staffId: payload.staffId, username: payload.username, role: payload.role });
  res.json({ ok: true, token });
});

export default router;
