import { Router } from 'express';
import { prisma } from '../db.js';
import { validateBody, walletTopupSchema, walletPaySchema, walletWithdrawSchema } from '../middleware/validate.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { logger } from '../services/logger.js';

const router = Router();

const STAFF_ROLES = ['operations', 'supervisor', 'support', 'accountant', 'finance', 'developer', 'business'];

function isOwnerOrStaff(req: { staff?: { staffId: string; role: string } }, userId: string): boolean {
  if (!req.staff) return false;
  return STAFF_ROLES.includes(req.staff.role) || req.staff.staffId === userId;
}

const memoryWallets: Record<string, { balance: number; currency: string; transactions: unknown[] }> = {};

function getOrCreateMemoryWallet(userId: string) {
  if (!memoryWallets[userId]) {
    memoryWallets[userId] = { balance: 0, currency: 'SDG', transactions: [] };
  }
  return memoryWallets[userId];
}

// GET /api/wallet/:userId — authenticated users only (own wallet or staff)
router.get('/:userId', requireAuth, async (req, res) => {
  const userId = String(req.params['userId'] || '');
  if (!isOwnerOrStaff(req, userId)) return res.status(403).json({ error: 'Access denied' });

  if (prisma) {
    let wallet = await prisma.wallet.findUnique({
      where: { userId },
      include: { transactions: { orderBy: { createdAt: 'desc' }, take: 30 } },
    });
    if (!wallet) {
      wallet = await prisma.wallet.create({
        data: { userId },
        include: { transactions: true },
      });
    }
    return res.json(wallet);
  }

  const wallet = getOrCreateMemoryWallet(userId);
  res.json({
    userId,
    balance: wallet.balance,
    currency: wallet.currency,
    transactions: (wallet.transactions as unknown[]).slice().reverse().slice(0, 30),
  });
});

// POST /api/wallet/:userId/topup — staff only (admin credits a user)
router.post('/:userId/topup', requireAuth, requireRole('operations', 'supervisor', 'accountant', 'finance', 'business', 'developer'), validateBody(walletTopupSchema), async (req, res) => {
  const userId = String(req.params.userId);
  const { amount, description = 'شحن رصيد' } = req.body as { amount: number; description?: string };

  if (prisma) {
    const wallet = await prisma.wallet.upsert({
      where: { userId },
      update: { balance: { increment: amount } },
      create: { userId, balance: amount },
    });
    await prisma.walletTransaction.create({
      data: { walletId: wallet.id, amount, type: 'TOPUP', description },
    });
    const updated = await prisma.wallet.findUnique({
      where: { userId },
      include: { transactions: { orderBy: { createdAt: 'desc' }, take: 30 } },
    });
    logger.info('Wallet topup', { userId, amount });
    return res.json(updated);
  }

  const wallet = getOrCreateMemoryWallet(userId);
  wallet.balance += amount;
  (wallet.transactions as unknown[]).push({ id: `tx_${Date.now()}`, amount, type: 'TOPUP', description, createdAt: new Date().toISOString() });
  res.json({ userId, balance: wallet.balance, currency: wallet.currency, transactions: (wallet.transactions as unknown[]).slice().reverse().slice(0, 30) });
});

// POST /api/wallet/:userId/pay — own wallet only (or staff)
router.post('/:userId/pay', requireAuth, validateBody(walletPaySchema), async (req, res) => {
  const userId = String(req.params.userId);
  if (!isOwnerOrStaff(req, userId)) return res.status(403).json({ error: 'Access denied' });
  const { amount, rideId = '', description = 'دفع رحلة' } = req.body as { amount: number; rideId?: string; description?: string };

  if (prisma) {
    const wallet = await prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) return res.status(404).json({ error: 'Wallet not found' });
    if (wallet.balance < amount) return res.status(402).json({ error: 'Insufficient balance', balance: wallet.balance });

    const updated = await prisma.wallet.update({
      where: { userId },
      data: { balance: { decrement: amount } },
    });
    await prisma.walletTransaction.create({
      data: { walletId: wallet.id, amount: -amount, type: 'RIDE_PAYMENT', description, rideId: rideId || undefined },
    });
    return res.json({ ok: true, balance: updated.balance, deducted: amount });
  }

  const wallet = getOrCreateMemoryWallet(userId);
  if (wallet.balance < amount) return res.status(402).json({ error: 'Insufficient balance', balance: wallet.balance });
  wallet.balance -= amount;
  (wallet.transactions as unknown[]).push({ id: `tx_${Date.now()}`, amount: -amount, type: 'RIDE_PAYMENT', description, rideId, createdAt: new Date().toISOString() });
  res.json({ ok: true, balance: wallet.balance, deducted: amount });
});

// POST /api/wallet/:userId/earn
router.post('/:userId/earn', requireAuth, requireRole('operations', 'supervisor', 'accountant', 'finance', 'business', 'developer'), async (req, res) => {
  const userId = String(req.params['userId'] || '');
  const amount = Math.round(Number(req.body.amount || 0));
  const rideId = String(req.body.rideId || '');
  const description = String(req.body.description || 'أرباح رحلة');

  if (!amount || amount <= 0) return res.status(400).json({ error: 'amount must be positive' });

  if (prisma) {
    const wallet = await prisma.wallet.upsert({
      where: { userId },
      update: { balance: { increment: amount } },
      create: { userId, balance: amount },
    });
    await prisma.walletTransaction.create({
      data: { walletId: wallet.id, amount, type: 'DRIVER_EARNING', description, rideId: rideId || undefined },
    });
    const updated = await prisma.wallet.findUnique({ where: { userId } });
    return res.json({ ok: true, balance: updated!.balance, credited: amount });
  }

  const wallet = getOrCreateMemoryWallet(userId);
  wallet.balance += amount;
  (wallet.transactions as unknown[]).push({ id: `tx_${Date.now()}`, amount, type: 'DRIVER_EARNING', description, rideId, createdAt: new Date().toISOString() });
  res.json({ ok: true, balance: wallet.balance, credited: amount });
});

// POST /api/wallet/:userId/withdraw — own wallet only (or staff)
router.post('/:userId/withdraw', requireAuth, validateBody(walletWithdrawSchema), async (req, res) => {
  const userId = String(req.params.userId);
  if (!isOwnerOrStaff(req, userId)) return res.status(403).json({ error: 'Access denied' });
  const { amount, bankAccount, description = 'طلب سحب' } = req.body as {
    amount: number; bankAccount: string; description?: string;
  };

  if (prisma) {
    const wallet = await prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) return res.status(404).json({ error: 'Wallet not found' });
    if (wallet.balance < amount) return res.status(402).json({ error: 'Insufficient balance', balance: wallet.balance });

    // Deduct balance immediately and record as WITHDRAWAL pending review
    const updated = await prisma.wallet.update({
      where: { userId },
      data: { balance: { decrement: amount } },
    });
    const tx = await prisma.walletTransaction.create({
      data: {
        walletId: wallet.id,
        amount: -amount,
        type: 'WITHDRAWAL',
        description: `${description} — حساب: ${bankAccount} — بانتظار المراجعة`,
      },
    });
    logger.info('Withdrawal requested', { userId, amount, bankAccount });
    return res.json({
      ok: true,
      balance: updated.balance,
      withdrawn: amount,
      transactionId: tx.id,
      status: 'pending_review',
      message: 'سيتم مراجعة طلب السحب خلال 1-3 أيام عمل',
    });
  }

  // In-memory fallback
  const wallet = getOrCreateMemoryWallet(userId);
  if (wallet.balance < amount) return res.status(402).json({ error: 'Insufficient balance', balance: wallet.balance });
  wallet.balance -= amount;
  const txId = `tx_${Date.now()}`;
  (wallet.transactions as unknown[]).push({
    id: txId,
    amount: -amount,
    type: 'WITHDRAWAL',
    description: `${description} — حساب: ${bankAccount}`,
    status: 'pending_review',
    createdAt: new Date().toISOString(),
  });
  res.json({
    ok: true,
    balance: wallet.balance,
    withdrawn: amount,
    transactionId: txId,
    status: 'pending_review',
    message: 'سيتم مراجعة طلب السحب خلال 1-3 أيام عمل',
  });
});

// GET /api/wallet/admin/wallets — list all wallets (admin overview)
router.get('/admin/wallets', requireAuth, requireRole('developer', 'business', 'accountant', 'finance', 'operations', 'supervisor'), async (req, res) => {
  const search = String(req.query.search || '').trim();
  const take = Math.min(Number(req.query.take || 50), 200);

  if (prisma) {
    const wallets = await prisma.wallet.findMany({
      where: search ? { userId: { contains: search } } : undefined,
      orderBy: { updatedAt: 'desc' },
      take,
      include: { transactions: { orderBy: { createdAt: 'desc' }, take: 5 } },
    });
    return res.json(wallets);
  }

  const all = Object.entries(memoryWallets).map(([userId, w]) => ({ userId, ...w }));
  const filtered = search ? all.filter((w) => w.userId.includes(search)) : all;
  res.json(filtered.slice(0, take));
});

// GET /api/wallet/admin/withdrawals — list pending withdrawals (admin only)
router.get('/admin/withdrawals', requireAuth, requireRole('developer', 'business', 'accountant', 'finance', 'operations'), async (_req, res) => {
  if (prisma) {
    const txs = await prisma.walletTransaction.findMany({
      where: { type: 'WITHDRAWAL' },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { wallet: { select: { userId: true, balance: true } } },
    });
    return res.json(txs);
  }
  // In-memory: collect all WITHDRAWAL transactions
  const all: unknown[] = [];
  for (const [userId, wallet] of Object.entries(memoryWallets)) {
    const txs = (wallet.transactions as Array<{ type: string; [k: string]: unknown }>)
      .filter((t) => t.type === 'WITHDRAWAL')
      .map((t) => ({ ...t, userId }));
    all.push(...txs);
  }
  res.json(all);
});

// PATCH /api/wallet/admin/withdrawals/:txId — approve or reject a withdrawal
router.patch('/admin/withdrawals/:txId', requireAuth, requireRole('developer', 'business', 'accountant', 'finance', 'operations'), async (req, res) => {
  const txId = String(req.params['txId']);
  const action = String(req.body.action || '');
  const reviewedBy = String(req.body.reviewedBy || '');

  if (!['approve', 'reject'].includes(action)) {
    return res.status(400).json({ error: 'action must be approve or reject' });
  }

  const note = String(req.body.note || '').trim();

  if (prisma) {
    const tx = await prisma.walletTransaction.findUnique({ where: { id: txId } }).catch(() => null);
    if (!tx) return res.status(404).json({ error: 'Transaction not found' });

    if (action === 'reject') {
      // Refund the deducted amount
      await prisma.wallet.update({
        where: { id: tx.walletId },
        data: { balance: { increment: Math.abs(tx.amount) } },
      }).catch(() => null);
      await prisma.walletTransaction.create({
        data: {
          walletId: tx.walletId,
          amount: Math.abs(tx.amount),
          type: 'REFUND',
          description: `رد مبلغ سحب مرفوض — مراجع: ${reviewedBy}${note ? ` — السبب: ${note}` : ''}`,
        },
      }).catch(() => null);
    }

    const updated = await prisma.walletTransaction.update({
      where: { id: txId },
      data: {
        description: `${tx.description} — ${action === 'approve' ? 'تمت الموافقة' : 'مرفوض'} بواسطة: ${reviewedBy}${note ? ` — السبب: ${note}` : ''}`,
      },
    }).catch(() => null);

    logger.info('Withdrawal reviewed', { txId, action, reviewedBy });
    return res.json({ ok: true, action, tx: updated });
  }

  res.json({ ok: true, action, txId, message: 'In-memory: no persistent state' });
});

export default router;
