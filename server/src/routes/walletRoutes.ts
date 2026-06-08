import { Router } from 'express';
import { prisma } from '../db.js';
import { validateBody, walletTopupSchema, walletPaySchema, walletWithdrawSchema } from '../middleware/validate.js';
import { logger } from '../services/logger.js';

const router = Router();

const memoryWallets: Record<string, { balance: number; currency: string; transactions: unknown[] }> = {};

function getOrCreateMemoryWallet(userId: string) {
  if (!memoryWallets[userId]) {
    memoryWallets[userId] = { balance: 0, currency: 'SDG', transactions: [] };
  }
  return memoryWallets[userId];
}

// GET /api/wallet/:userId
router.get('/:userId', async (req, res) => {
  const { userId } = req.params;

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

// POST /api/wallet/:userId/topup
router.post('/:userId/topup', validateBody(walletTopupSchema), async (req, res) => {
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

// POST /api/wallet/:userId/pay
router.post('/:userId/pay', validateBody(walletPaySchema), async (req, res) => {
  const userId = String(req.params.userId);
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
router.post('/:userId/earn', async (req, res) => {
  const { userId } = req.params;
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

// POST /api/wallet/:userId/withdraw — request a withdrawal (pending admin approval)
router.post('/:userId/withdraw', validateBody(walletWithdrawSchema), async (req, res) => {
  const userId = String(req.params.userId);
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

export default router;
