import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';

// Import after setup.ts has set env vars
const { app } = await import('../main.js');

describe('Auth — OTP flow', () => {
  const phone = '+249900000099';

  it('POST /api/auth/request-otp — returns ok with valid phone', async () => {
    const res = await request(app).post('/api/auth/request-otp').send({ phone });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.phone).toBe(phone);
  });

  it('POST /api/auth/request-otp — 400 with missing phone', async () => {
    const res = await request(app).post('/api/auth/request-otp').send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('POST /api/auth/verify-otp — 401 with wrong code', async () => {
    const res = await request(app).post('/api/auth/verify-otp').send({ phone, code: '000000' });
    expect(res.status).toBe(401);
    expect(res.body.error).toBeDefined();
  });

  it('POST /api/auth/verify-otp — success with OTP_OVERRIDE code', async () => {
    const res = await request(app)
      .post('/api/auth/verify-otp')
      .send({ phone, code: '123456', name: 'Test User', role: 'PASSENGER' });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.phone).toBe(phone);
  });

  it('POST /api/auth/verify-otp — 400 with short code', async () => {
    const res = await request(app).post('/api/auth/verify-otp').send({ phone, code: '12' });
    expect(res.status).toBe(400);
  });
});

describe('Auth — Staff login', () => {
  it('POST /api/staff/login — 400 with missing fields', async () => {
    const res = await request(app).post('/api/staff/login').send({ username: '' });
    expect(res.status).toBe(400);
  });

  it('POST /api/staff/login — 401 with wrong credentials', async () => {
    const res = await request(app)
      .post('/api/staff/login')
      .send({ username: 'ghost', password: 'wrongpassword', role: 'operations' });
    expect(res.status).toBe(401);
  });
});
