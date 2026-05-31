import { Router } from 'express';
import { prisma } from '../db.js';
import { memorySupportRequests } from '../store.js';

const router = Router();

router.get('/', async (_req, res) => {
  if (prisma) {
    const requests = await prisma.supportRequest.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return res.json(requests);
  }
  res.json(memorySupportRequests.slice().reverse());
});

router.post('/', async (req, res) => {
  const category = String(req.body.category || '').trim();
  const message = String(req.body.message || '').trim();
  const lang = String(req.body.lang || 'ar').trim();
  const phone = String(req.body.phone || '').trim() || null;
  const name = String(req.body.name || '').trim() || null;

  if (!category || !message) return res.status(400).json({ error: 'category and message are required' });
  if (message.length > 2000) return res.status(400).json({ error: 'Message is too long' });

  if (prisma) {
    const request = await prisma.supportRequest.create({
      data: { category, message, lang, phone, name },
    });
    return res.status(201).json({ ok: true, request });
  }

  const request = {
    id: `support_${Date.now()}`,
    category,
    message,
    lang,
    phone,
    name,
    status: 'OPEN',
    createdAt: new Date().toISOString(),
  };
  memorySupportRequests.push(request);
  res.status(201).json({ ok: true, request });
});

router.patch('/:id/status', async (req, res) => {
  const status = String(req.body.status || 'OPEN');
  const allowed = ['OPEN', 'IN_REVIEW', 'RESOLVED', 'CLOSED'];
  if (!allowed.includes(status)) return res.status(400).json({ error: 'Invalid status value' });

  if (prisma) {
    const request = await prisma.supportRequest
      .update({ where: { id: req.params.id }, data: { status: status as 'OPEN' | 'IN_REVIEW' | 'RESOLVED' | 'CLOSED' } })
      .catch(() => null);
    if (!request) return res.status(404).json({ error: 'Support request not found' });
    return res.json(request);
  }

  const request = memorySupportRequests.find((r) => r.id === req.params.id);
  if (!request) return res.status(404).json({ error: 'Support request not found' });
  request.status = status;
  request.updatedAt = new Date().toISOString();
  res.json(request);
});

export default router;
