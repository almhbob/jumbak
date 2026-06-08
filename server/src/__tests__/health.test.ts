import { describe, it, expect } from 'vitest';
import request from 'supertest';

const { app } = await import('../main.js');

describe('Health & Config', () => {
  it('GET /health — returns ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.app).toBe('Jnbk');
  });

  it('GET / — returns app info', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body.app).toBe('Jnbk');
    expect(res.body.realtime).toBe('/socket.io');
  });

  it('GET /api/config — returns cities and vehicle types', async () => {
    const res = await request(app).get('/api/config');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.cities)).toBe(true);
    expect(Array.isArray(res.body.vehicleTypes)).toBe(true);
  });

  it('POST /api/pricing/estimate — returns fare estimate', async () => {
    const res = await request(app)
      .post('/api/pricing/estimate')
      .send({ distanceKm: 5, vehicleTypeId: 'rickshaw', cityId: 'rufaa' });
    expect(res.status).toBe(200);
    expect(typeof res.body.estimatedFare).toBe('number');
    expect(res.body.estimatedFare).toBeGreaterThan(0);
  });
});
