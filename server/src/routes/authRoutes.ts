import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import { prisma } from '../db.js';
import { memoryStaff, memoryUsers } from '../store.js';
import { signToken } from '../middleware/auth.js';
import { UserRole } from '@prisma/client';
import { verifyFirebaseIdToken } from '../services/firebaseAdmin.js';

const router = Router();

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

function publicStaff(member: { id: string; name: string; phone: string | null; email: string | null; username: string; role: string; status: string; lastLoginAt: Date | null | string }) {
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

// OTP request — replace with real SMS provider before production
router.post('/auth/request-otp', (req, res) => {
  const phone = String(req.body.phone || '').trim();
  if (!phone) return res.status(400).json({ error: 'Phone is required' });
  res.json({ ok: true, phone, message: 'OTP sent' });
});

// OTP verify — hardcoded 123456 for development only
router.post('/auth/verify-otp', async (req, res) => {
  const phone = String(req.body.phone || '').trim();
  const code = String(req.body.code || '').trim();
  const name = String(req.body.name || '').trim() || null;
  const role = normalizeUserRole(String(req.body.role || 'PASSENGER'));

  if (!phone) return res.status(400).json({ error: 'Phone is required' });
  if (code !== '123456') return res.status(401).json({ error: 'Invalid OTP' });

  if (prisma) {
    const user = await prisma.user.upsert({
      where: { phone },
      update: { name: name || undefined, role },
      create: { phone, name, role },
    });
    return res.json({ ok: true, user: { id: user.id, phone: user.phone, name: user.name, role: user.role }, token: `user_${user.id}` });
  }

  let user = memoryUsers.find((u) => u.phone === phone);
  if (!user) {
    user = { id: `user_${Date.now()}`, phone, name, role, createdAt: new Date().toISOString() };
    memoryUsers.push(user);
  } else {
    user.name = name || user.name;
    user.role = role;
  }
  res.json({ ok: true, user: { id: user.id, phone: user.phone, name: user.name, role: user.role }, token: `user_${user.id}` });
});

// Firebase Phone Auth verification
// Mobile sends Firebase ID token → server verifies → returns app JWT
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

// Staff login
router.post('/staff/login', loginLimiter, async (req, res) => {
  const username = String(req.body.username || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  const role = normalizeStaffRole(String(req.body.role || 'operations'));

  if (!username || !password) {
    return res.status(400).json({ error: 'username and password are required' });
  }

  if (prisma) {
    const member = await prisma.staffMember.findUnique({ where: { username } }).catch(() => null);
    if (!member) return res.status(401).json({ error: 'Invalid credentials' });

    const passwordMatch = await bcrypt.compare(password, member.passwordHash);
    if (!passwordMatch) return res.status(401).json({ error: 'Invalid credentials' });

    if (String(member.role).toLowerCase() !== role) return res.status(401).json({ error: 'Invalid credentials' });
    if (member.status !== 'ACTIVE') return res.status(403).json({ error: 'Account is not active' });

    await prisma.staffMember.update({ where: { id: member.id }, data: { lastLoginAt: new Date() } }).catch(() => null);

    const token = signToken({ staffId: member.id, username, role });
    return res.json({ ok: true, staff: publicStaff(member), token });
  }

  // In-memory fallback (development/preview only)
  const member = memoryStaff.find((m) => m.username === username && m.role === role && m.status === 'active');
  if (!member) return res.status(401).json({ error: 'Invalid credentials' });

  const passwordMatch = await bcrypt.compare(password, member.passwordHash);
  if (!passwordMatch) return res.status(401).json({ error: 'Invalid credentials' });

  member.lastLoginAt = new Date().toISOString();
  const token = signToken({ staffId: member.id, username, role });
  res.json({ ok: true, staff: publicStaff(member), token });
});

export default router;
