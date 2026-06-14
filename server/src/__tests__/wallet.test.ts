import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { signToken } from '../middleware/auth.js';

const { app } = await import('../main.js');

// passenger token — staffId matches userId so isOwnerOrStaff passes
const userId = `test_user_${Date.now()}`;
const userToken = signToken({ staffId: userId, username: 'testuser', role: 'passenger' });
const staffToken = signToken({ staffId: 'staff_test', username: 'staff', role: 'finance' });

describe('Wallet', () => {
  it('GET /api/wallet/:userId — creates wallet on first access', async () => {
    const res = await request(app)
      .get(`/api/wallet/${userId}`)
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(200);
    expect(res.body.balance).toBe(0);
  });

  it('POST /api/wallet/:userId/topup — 400 with zero amount', async () => {
    const res = await request(app)
      .post(`/api/wallet/${userId}/topup`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ amount: 0 });
    expect(res.status).toBe(400);
  });

  it('POST /api/wallet/:userId/topup — 400 with negative amount', async () => {
    const res = await request(app)
      .post(`/api/wallet/${userId}/topup`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ amount: -100 });
    expect(res.status).toBe(400);
  });

  it('POST /api/wallet/:userId/topup — adds balance', async () => {
    const res = await request(app)
      .post(`/api/wallet/${userId}/topup`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ amount: 500, description: 'Test topup' });
    expect(res.status).toBe(200);
    expect(res.body.balance).toBe(500);
  });

  it('POST /api/wallet/:userId/pay — deducts from balance', async () => {
    const res = await request(app)
      .post(`/api/wallet/${userId}/pay`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ amount: 100, rideId: 'ride_test', description: 'Test ride' });
    expect(res.status).toBe(200);
    expect(res.body.deducted).toBe(100);
    expect(res.body.balance).toBe(400);
  });

  it('POST /api/wallet/:userId/pay — 402 when insufficient balance', async () => {
    const res = await request(app)
      .post(`/api/wallet/${userId}/pay`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ amount: 9999 });
    expect(res.status).toBe(402);
    expect(res.body.error).toMatch(/[Ii]nsufficient/);
  });

  it('POST /api/wallet/:userId/withdraw — requests withdrawal', async () => {
    const res = await request(app)
      .post(`/api/wallet/${userId}/withdraw`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ amount: 200, bankAccount: '1234567890', description: 'Test withdrawal' });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.status).toBe('pending_review');
    expect(res.body.balance).toBe(200);
  });

  it('POST /api/wallet/:userId/withdraw — 402 when balance insufficient', async () => {
    const res = await request(app)
      .post(`/api/wallet/${userId}/withdraw`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ amount: 9999, bankAccount: '1234567890' });
    expect(res.status).toBe(402);
  });

  it('POST /api/wallet/:userId/withdraw — 400 when bank account missing', async () => {
    const res = await request(app)
      .post(`/api/wallet/${userId}/withdraw`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ amount: 100 });
    expect(res.status).toBe(400);
  });
});
