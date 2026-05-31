import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../db.js';
import { memoryStaff } from '../store.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { StaffRole, StaffStatus } from '@prisma/client';

const router = Router();
const BCRYPT_ROUNDS = 10;

type StaffRoleInput = 'operations' | 'supervisor' | 'support' | 'accountant' | 'finance' | 'developer' | 'business';

function normalizeStaffRole(role: string): StaffRoleInput {
  const normalized = String(role || '').toLowerCase();
  if (['supervisor', 'support', 'accountant', 'finance', 'developer', 'business'].includes(normalized)) {
    return normalized as StaffRoleInput;
  }
  return 'operations';
}

function toDbStaffRole(role: StaffRoleInput): StaffRole {
  return role.toUpperCase() as StaffRole;
}

function publicStaff(member: { id: string; name: string; phone: string | null; email: string | null; username: string; role: string; status: string; notes: string | null; lastLoginAt: Date | string | null; createdAt?: Date | string }) {
  return {
    id: member.id,
    name: member.name,
    phone: member.phone,
    email: member.email,
    username: member.username,
    role: String(member.role || '').toLowerCase(),
    status: String(member.status || '').toLowerCase(),
    notes: member.notes,
    lastLoginAt: member.lastLoginAt,
    createdAt: member.createdAt,
  };
}

// List staff — business and developer roles only
router.get('/', requireAuth, requireRole('business', 'developer'), async (_req, res) => {
  if (prisma) {
    const staff = await prisma.staffMember.findMany({ orderBy: { createdAt: 'desc' } }).catch(() => []);
    return res.json(staff.map(publicStaff));
  }
  res.json(memoryStaff.slice().reverse().map(publicStaff));
});

// Create staff — business role only
router.post('/', requireAuth, requireRole('business', 'developer'), async (req, res) => {
  const name = String(req.body.name || '').trim();
  const role = normalizeStaffRole(String(req.body.role || 'operations'));
  const phone = String(req.body.phone || '').trim() || null;
  const email = String(req.body.email || '').trim() || null;
  const notes = String(req.body.notes || '').trim() || null;
  const username = String(req.body.username || `${name.toLowerCase().replace(/\s+/g, '.')}.${role}`).trim().toLowerCase();
  const temporaryPassword = String(req.body.password || `Jnbk@${Math.floor(1000 + Math.random() * 9000)}#`);

  if (!name || !username) return res.status(400).json({ error: 'name and username are required' });
  if (name.length > 100 || username.length > 50) return res.status(400).json({ error: 'Input exceeds allowed length' });

  const passwordHash = await bcrypt.hash(temporaryPassword, BCRYPT_ROUNDS);

  if (prisma) {
    const existing = await prisma.staffMember.findUnique({ where: { username } }).catch(() => null);
    if (existing) return res.status(409).json({ error: 'Username already exists' });

    const member = await prisma.staffMember.create({
      data: { name, phone, email, username, passwordHash, role: toDbStaffRole(role), notes },
    });
    return res.status(201).json({ ok: true, staff: publicStaff(member), temporaryPassword });
  }

  if (memoryStaff.find((m) => m.username === username)) {
    return res.status(409).json({ error: 'Username already exists' });
  }

  const member = {
    id: `staff_${Date.now()}`,
    name,
    phone,
    email,
    username,
    passwordHash,
    role,
    status: 'active',
    notes,
    createdAt: new Date().toISOString(),
    lastLoginAt: null,
  };
  memoryStaff.push(member);
  res.status(201).json({ ok: true, staff: publicStaff(member), temporaryPassword });
});

// Update staff status or role — business/developer only
router.patch('/:id', requireAuth, requireRole('business', 'developer'), async (req, res) => {
  const id = String(req.params.id);
  const rawStatus = req.body.status ? String(req.body.status).toUpperCase() : undefined;
  const newRole = req.body.role ? normalizeStaffRole(String(req.body.role)) : undefined;

  if (rawStatus && !['ACTIVE', 'PAUSED'].includes(rawStatus)) {
    return res.status(400).json({ error: 'Invalid status value' });
  }

  if (prisma) {
    const member = await prisma.staffMember.update({
      where: { id },
      data: {
        ...(rawStatus ? { status: rawStatus as StaffStatus } : {}),
        ...(newRole ? { role: toDbStaffRole(newRole) } : {}),
      },
    }).catch(() => null);
    if (!member) return res.status(404).json({ error: 'Staff member not found' });
    return res.json({ ok: true, staff: publicStaff(member) });
  }

  const member = memoryStaff.find((m) => m.id === id);
  if (!member) return res.status(404).json({ error: 'Staff member not found' });
  if (rawStatus) member.status = rawStatus.toLowerCase();
  if (newRole) member.role = newRole;
  res.json({ ok: true, staff: publicStaff(member) });
});

// Change own password — any authenticated staff
router.patch('/change-password', requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body as { currentPassword?: string; newPassword?: string };

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'currentPassword and newPassword are required' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'newPassword must be at least 6 characters' });
  }
  if (newPassword === '123456') {
    return res.status(400).json({ error: 'Cannot reuse the default password' });
  }

  const staffId = req.staff!.staffId;

  if (prisma) {
    const member = await prisma.staffMember.findUnique({ where: { id: staffId } }).catch(() => null);
    if (!member) return res.status(404).json({ error: 'Staff not found' });

    const match = await bcrypt.compare(currentPassword, member.passwordHash);
    if (!match) return res.status(401).json({ error: 'Current password is incorrect' });

    const newHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await prisma.staffMember.update({ where: { id: staffId }, data: { passwordHash: newHash } });
    return res.json({ ok: true });
  }

  const member = memoryStaff.find((m) => m.id === staffId);
  if (!member) return res.status(404).json({ error: 'Staff not found' });

  const match = await bcrypt.compare(currentPassword, member.passwordHash);
  if (!match) return res.status(401).json({ error: 'Current password is incorrect' });

  member.passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  res.json({ ok: true });
});

export default router;
