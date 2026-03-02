import { describe, it, expect } from 'bun:test';
import request from 'supertest';
import app from '../src/app.js';

describe('Marketplace API', () => {
  it('should list active listings', async () => {
    const res = await request(app).get('/marketplace/listings');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('should list available services', async () => {
    const res = await request(app).get('/marketplace/services');
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0]).toHaveProperty('name');
  });

  it('should block listing creation (REST restricted)', async () => {
    const res = await request(app).post('/marketplace/listings');
    expect(res.status).toBe(401); // Unauthorized
  });
});
