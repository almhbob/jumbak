import { Router } from 'express';
import { prisma } from '../db.js';

const router = Router();

const memoryWallets: Record<string, { balance: number; currency: string; transactions: any[] }> = {};

function getOrCreateMemoryWallet(userId: string) {
  if (!memoryWallets[userId]) {
    memoryWallets[userId] = { balance: 0, currency: 'SDG', transactions: [] };
  }
  return memoryWallets[userId];
}

// GET /api/wallet/:userId — fetch balance + recent transactions
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
  res.json({ userId, balance: wallet.balance, currency: wallet.currency, transactions: wallet.transactions.slice().reverse().slice(0, 30) });
});

// POST /api/wallet/:userId/topup — add funds (admin or future payment gateway)
router.post('/:userId/topup', async (req, res) => {
  const { userId } = req.params;
  const amount = Math.round(Number(req.body.amount || 0));
  const description = String(req.body.description || 'شحن رصيد');

  if (!amount || amount <= 0) return res.status(400).json({ error: 'amount must be positive' });

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
    return res.json(updated);
  }

  const wallet = getOrCreateMemoryWallet(userId);
  wallet.balance += amount;
  wallet.transactions.push({ id: `tx_${Date.now()}`, amount, type: 'TOPUP', description, createdAt: new Date().toISOString() });
  res.json({ userId, balance: wallet.balance, currency: wallet.currency, transactions: wallet.transactions.slice().reverse().slice(0, 30) });
});

// POST /api/wallet/:userId/pay — deduct fare for a ride
router.post('/:userId/pay', async (req, res) => {
  const { userId } = req.params;
  const amount = Math.round(Number(req.body.amount || 0));
  const rideId = String(req.body.rideId || '');
  const description = String(req.body.description || 'دفع رحلة');

  if (!amount || amount <= 0) return res.status(400).json({ error: 'amount must be positive' });

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
  wallet.transactions.push({ id: `tx_${Date.now()}`, amount: -amount, type: 'RIDE_PAYMENT', description, rideId, createdAt: new Date().toISOString() });
  res.json({ ok: true, balance: wallet.balance, deducted: amount });
});

// POST /api/wallet/:userId/earn — credit driver earnings after ride
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
  wallet.transactions.push({ id: `tx_${Date.now()}`, amount, type: 'DRIVER_EARNING', description, rideId, createdAt: new Date().toISOString() });
  res.json({ ok: true, balance: wallet.balance, credited: amount });
});

export default router;
