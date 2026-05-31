import { Router } from 'express';
import { prisma } from '../db.js';
import { memoryTokens } from '../store.js';
import { requireAuth } from '../middleware/auth.js';
import { Expo, sendPushNotifications } from '../services/notificationService.js';

const router = Router();

// POST /api/notifications/register-token
// Body: { token: string, userId: string }
router.post('/register-token', async (req, res) => {
  const { token, userId } = req.body;

  if (!token || !Expo.isExpoPushToken(token)) {
    return res.status(400).json({ error: 'Invalid Expo push token' });
  }
  if (!userId || typeof userId !== 'string') {
    return res.status(400).json({ error: 'userId is required' });
  }

  if (prisma) {
    await prisma.deviceToken.upsert({
      where: { token },
      update: { userId, updatedAt: new Date() },
      create: { token, userId, platform: 'expo' },
    });
    return res.json({ ok: true });
  }

  const existing = memoryTokens.findIndex((t) => t.token === token);
  if (existing >= 0) {
    memoryTokens[existing].userId = userId;
  } else {
    memoryTokens.push({ token, userId, platform: 'expo' });
  }
  res.json({ ok: true });
});

// DELETE /api/notifications/register-token
// Body: { token: string }
router.delete('/register-token', async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: 'token is required' });

  if (prisma) {
    await prisma.deviceToken.deleteMany({ where: { token } }).catch(() => null);
    return res.json({ ok: true });
  }

  const idx = memoryTokens.findIndex((t) => t.token === token);
  if (idx >= 0) memoryTokens.splice(idx, 1);
  res.json({ ok: true });
});

// POST /api/notifications/send  (staff-only: requireAuth)
// Body: { userIds: string[], title: string, body: string, data?: object }
router.post('/send', requireAuth, async (req, res) => {
  const { userIds, title, body, data } = req.body;
  if (!userIds || !Array.isArray(userIds) || !title || !body) {
    return res.status(400).json({ error: 'userIds[], title, and body are required' });
  }

  let tokens: string[] = [];

  if (prisma) {
    const rows = await prisma.deviceToken.findMany({ where: { userId: { in: userIds } } });
    tokens = rows.map((r) => r.token);
  } else {
    tokens = memoryTokens.filter((t) => userIds.includes(t.userId)).map((t) => t.token);
  }

  const tickets = await sendPushNotifications(tokens, title, body, data);
  res.json({ ok: true, sent: tokens.length, tickets });
});

export default router;
