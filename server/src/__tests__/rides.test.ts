import { describe, it, expect } from 'vitest';
import request from 'supertest';

const { app } = await import('../main.js');

describe('Rides', () => {
  let rideId: string;

  it('GET /api/rides — returns array', async () => {
    const res = await request(app).get('/api/rides');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('POST /api/rides — 400 with missing required fields', async () => {
    const res = await request(app).post('/api/rides').send({});
    expect(res.status).toBe(400);
    expect(res.body.errors).toBeDefined();
  });

  it('POST /api/rides — creates ride with valid data', async () => {
    const res = await request(app).post('/api/rides').send({
      cityId: 'rufaa',
      vehicleTypeId: 'rickshaw',
      pickupLabel: 'المستشفى',
      destinationLabel: 'السوق',
      distanceKm: 3,
    });
    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.status).toBe('REQUESTED');
    rideId = res.body.id;
  });

  it('GET /api/rides/:id — returns created ride', async () => {
    const res = await request(app).get(`/api/rides/${rideId}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(rideId);
  });

  it('PATCH /api/rides/:id/status — updates to ACCEPTED', async () => {
    const res = await request(app)
      .patch(`/api/rides/${rideId}/status`)
      .send({ status: 'ACCEPTED' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ACCEPTED');
  });

  it('PATCH /api/rides/:id/status — 400 with invalid status', async () => {
    const res = await request(app)
      .patch(`/api/rides/${rideId}/status`)
      .send({ status: 'FLYING' });
    expect(res.status).toBe(400);
  });

  it('PATCH /api/rides/:id/rating — rates completed ride', async () => {
    // First complete the ride
    await request(app).patch(`/api/rides/${rideId}/status`).send({ status: 'COMPLETED' });
    const res = await request(app)
      .patch(`/api/rides/${rideId}/rating`)
      .send({ rating: 5 });
    expect(res.status).toBe(200);
    expect(res.body.rating).toBe(5);
  });

  it('PATCH /api/rides/:id/rating — 400 with out-of-range rating', async () => {
    const res = await request(app)
      .patch(`/api/rides/${rideId}/rating`)
      .send({ rating: 6 });
    expect(res.status).toBe(400);
  });

  it('GET /api/rides/nonexistent — 404', async () => {
    const res = await request(app).get('/api/rides/nonexistent_ride_000');
    expect(res.status).toBe(404);
  });
});
