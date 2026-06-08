import { describe, it, expect } from 'vitest';
import request from 'supertest';

const { app } = await import('../main.js');

const userId = `test_user_${Date.now()}`;

describe('Wallet', () => {
  it('GET /api/wallet/:userId — creates wallet on first access', async () => {
    const res = await request(app).get(`/api/wallet/${userId}`);
    expect(res.status).toBe(200);
    expect(res.body.balance).toBe(0);
  });

  it('POST /api/wallet/:userId/topup — 400 with zero amount', async () => {
    const res = await request(app).post(`/api/wallet/${userId}/topup`).send({ amount: 0 });
    expect(res.status).toBe(400);
  });

  it('POST /api/wallet/:userId/topup — 400 with negative amount', async () => {
    const res = await request(app).post(`/api/wallet/${userId}/topup`).send({ amount: -100 });
    expect(res.status).toBe(400);
  });

  it('POST /api/wallet/:userId/topup — adds balance', async () => {
    const res = await request(app)
      .post(`/api/wallet/${userId}/topup`)
      .send({ amount: 500, description: 'Test topup' });
    expect(res.status).toBe(200);
    expect(res.body.balance).toBe(500);
  });

  it('POST /api/wallet/:userId/pay — deducts from balance', async () => {
    const res = await request(app)
      .post(`/api/wallet/${userId}/pay`)
      .send({ amount: 100, rideId: 'ride_test', description: 'Test ride' });
    expect(res.status).toBe(200);
    expect(res.body.deducted).toBe(100);
    expect(res.body.balance).toBe(400);
  });

  it('POST /api/wallet/:userId/pay — 402 when insufficient balance', async () => {
    const res = await request(app)
      .post(`/api/wallet/${userId}/pay`)
      .send({ amount: 9999 });
    expect(res.status).toBe(402);
    expect(res.body.error).toMatch(/[Ii]nsufficient/);
  });

  it('POST /api/wallet/:userId/withdraw — requests withdrawal', async () => {
    const res = await request(app)
      .post(`/api/wallet/${userId}/withdraw`)
      .send({ amount: 200, bankAccount: '1234567890', description: 'Test withdrawal' });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.status).toBe('pending_review');
    expect(res.body.balance).toBe(200);
  });

  it('POST /api/wallet/:userId/withdraw — 402 when balance insufficient', async () => {
    const res = await request(app)
      .post(`/api/wallet/${userId}/withdraw`)
      .send({ amount: 9999, bankAccount: '1234567890' });
    expect(res.status).toBe(402);
  });

  it('POST /api/wallet/:userId/withdraw — 400 when bank account missing', async () => {
    const res = await request(app)
      .post(`/api/wallet/${userId}/withdraw`)
      .send({ amount: 100 });
    expect(res.status).toBe(400);
  });
});
