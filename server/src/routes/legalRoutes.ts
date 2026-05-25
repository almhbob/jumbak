import { Router } from 'express';
import { prisma } from '../db.js';
import { memoryLegalDocuments } from '../store.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

router.get('/:key', async (req, res) => {
  const key = String(req.params.key || '').trim().toLowerCase();
  if (!key) return res.status(400).json({ error: 'key is required' });

  if (prisma) {
    const doc = await prisma.legalDocument.findUnique({ where: { key } }).catch(() => null);
    if (!doc) return res.status(404).json({ error: 'Legal document not found' });
    return res.json(doc);
  }

  const doc = memoryLegalDocuments.find((d) => d.key === key);
  if (!doc) return res.status(404).json({ error: 'Legal document not found' });
  res.json(doc);
});

router.put('/:key', requireAuth, requireRole('developer', 'business'), async (req, res) => {
  const key = String(req.params.key || '').trim().toLowerCase();
  const titleAr = String(req.body.titleAr || '').trim();
  const titleEn = String(req.body.titleEn || '').trim();
  const contentAr = String(req.body.contentAr || '').trim();
  const contentEn = String(req.body.contentEn || '').trim();
  const status = String(req.body.status || 'draft').trim();
  const updatedBy = String(req.body.updatedBy || '').trim() || null;

  if (!key || !titleAr || !titleEn || !contentAr || !contentEn) {
    return res.status(400).json({ error: 'Missing legal document fields' });
  }

  if (prisma) {
    const existing = await prisma.legalDocument.findUnique({ where: { key } }).catch(() => null);
    const doc = await prisma.legalDocument.upsert({
      where: { key },
      create: { key, titleAr, titleEn, contentAr, contentEn, status, updatedBy },
      update: { titleAr, titleEn, contentAr, contentEn, status, updatedBy, version: { increment: 1 } },
    });
    return res.json({ ok: true, document: doc, created: !existing });
  }

  const index = memoryLegalDocuments.findIndex((d) => d.key === key);
  const now = new Date().toISOString();
  const doc = {
    key,
    titleAr,
    titleEn,
    contentAr,
    contentEn,
    status,
    updatedBy,
    version: index >= 0 ? memoryLegalDocuments[index].version + 1 : 1,
    updatedAt: now,
    createdAt: index >= 0 ? memoryLegalDocuments[index].createdAt : now,
  };

  if (index >= 0) memoryLegalDocuments[index] = doc;
  else memoryLegalDocuments.push(doc);

  res.json({ ok: true, document: doc, created: index < 0 });
});

export default router;
