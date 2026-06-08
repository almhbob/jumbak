import { describe, it, expect } from 'vitest';
import request from 'supertest';

const { app } = await import('../main.js');

describe('Drivers', () => {
  it('GET /api/drivers — returns array', async () => {
    const res = await request(app).get('/api/drivers');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('GET /api/drivers?cityId=rufaa — filters by city', async () => {
    const res = await request(app).get('/api/drivers?cityId=rufaa');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('POST /api/drivers/register — 400 with missing required fields', async () => {
    const res = await request(app).post('/api/drivers/register').send({});
    expect(res.status).toBe(400);
    expect(res.body.errors).toBeDefined();
  });

  it('POST /api/drivers/register — 400 with invalid phone', async () => {
    const res = await request(app).post('/api/drivers/register').send({
      phone: 'notaphone',
      name: 'Test Driver',
      cityId: 'rufaa',
      vehicleTypeId: 'rickshaw',
      plateNo: 'ABC123',
      color: 'Red',
      model: 'Bajaj',
    });
    expect(res.status).toBe(400);
  });

  it('POST /api/drivers/register — creates driver with valid data', async () => {
    const phone = `+249${Math.floor(100000000 + Math.random() * 900000000)}`;
    const res = await request(app).post('/api/drivers/register').send({
      phone,
      name: 'Mohammed Test',
      cityId: 'rufaa',
      vehicleTypeId: 'rickshaw',
      plateNo: 'ABC123',
      color: 'Blue',
      model: 'Bajaj RE',
      guarantorName: 'Ahmed Ali',
      guarantorPhone: '+249911111111',
    });
    expect(res.status).toBe(201);
    expect(res.body.ok).toBe(true);
  });

  it('GET /api/drivers/applications — returns list', async () => {
    const res = await request(app).get('/api/drivers/applications');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});
